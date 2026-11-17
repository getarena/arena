/* global process */
import crypto from 'node:crypto'
import { DEFAULT_UPSTREAM_TIMEOUT_MS } from './requestSecurity.js'

let cachedAccessToken = null
let cachedAccessTokenExpiresAt = 0

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.')

  let serviceAccount
  try {
    serviceAccount = JSON.parse(raw)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.')
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is incomplete.')
  }
  return serviceAccount
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedAccessToken && cachedAccessTokenExpiresAt - now > 60) return cachedAccessToken

  const serviceAccount = getServiceAccount()
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key)
  const assertion = `${unsigned}.${base64Url(signature)}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(DEFAULT_UPSTREAM_TIMEOUT_MS),
  })

  if (!response.ok) {
    await response.text().catch(() => '')
    console.error('Google OAuth token error:', { status: response.status })
    throw new Error('Could not authorize the server data service.')
  }

  const data = await response.json()
  if (!data.access_token) throw new Error('Server data service authorization failed.')

  cachedAccessToken = data.access_token
  cachedAccessTokenExpiresAt = now + Number(data.expires_in || 3600)
  return cachedAccessToken
}

export async function firestoreRequest(path, options = {}) {
  const serviceAccount = getServiceAccount()
  const token = await getAccessToken()
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/databases/(default)/documents${path}`,
    {
      ...options,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      signal: options.signal || AbortSignal.timeout(DEFAULT_UPSTREAM_TIMEOUT_MS),
    },
  )

  if (!response.ok) {
    await response.text().catch(() => '')
    console.error('Firestore REST error:', { status: response.status })
    const error = new Error('The server could not update Arena data.')
    error.status = response.status
    throw error
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export function fsString(value) { return { stringValue: String(value) } }
export function fsDouble(value) { return { doubleValue: Number(value) } }
export function fsBool(value) { return { booleanValue: Boolean(value) } }
export function fsTimestamp(value = new Date()) { return { timestampValue: new Date(value).toISOString() } }
export function fsNull() { return { nullValue: null } }

export function encodeValue(value) {
  if (value === null || value === undefined) return fsNull()
  if (typeof value === 'string') return fsString(value)
  if (typeof value === 'boolean') return fsBool(value)
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : fsDouble(value)
  if (value instanceof Date) return fsTimestamp(value)
  throw new Error(`Unsupported Firestore value type: ${typeof value}`)
}

export function encodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)]))
}

export function decodeValue(value) {
  if (!value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {})
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  return null
}

export function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

export function documentToObject(document) {
  if (!document) return null
  const parts = document.name.split('/')
  return { id: parts[parts.length - 1], ...decodeFields(document.fields || {}) }
}

export async function getDocument(path) {
  try {
    const data = await firestoreRequest(path, { method: 'GET' })
    return documentToObject(data)
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
}

export async function listDocuments(path, options = {}) {
  const items = []
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(0, Math.floor(options.maxItems)) : Infinity
  if (maxItems === 0) return items
  const pageSize = Number.isFinite(options.pageSize) ? Math.max(1, Math.min(1000, Math.floor(options.pageSize))) : 1000
  let pageToken = ''
  do {
    const params = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '')
    params.set('pageSize', String(Math.min(pageSize, Math.max(1, maxItems - items.length))))
    if (options.orderBy) params.set('orderBy', String(options.orderBy))
    if (pageToken) params.set('pageToken', pageToken)
    const base = path.split('?')[0]
    const data = await firestoreRequest(`${base}?${params.toString()}`, { method: 'GET' })
    for (const document of (data?.documents || [])) {
      items.push(documentToObject(document))
      if (items.length >= maxItems) break
    }
    pageToken = items.length >= maxItems ? '' : (data?.nextPageToken || '')
  } while (pageToken)
  return items
}

export async function queryDocuments(collectionId, field, value, options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(1000, Math.floor(options.limit))) : null
  const structuredQuery = {
    from: [{ collectionId }],
    where: {
      fieldFilter: {
        field: { fieldPath: field },
        op: 'EQUAL',
        value: encodeValue(value),
      },
    },
    ...(limit ? { limit } : {}),
  }
  const data = await firestoreRequest(':runQuery', {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  })

  return (Array.isArray(data) ? data : [])
    .filter((item) => item.document)
    .map((item) => documentToObject(item.document))
}

export async function patchDocument(path, fields) {
  const fieldPaths = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&')
  return firestoreRequest(`${path}?${fieldPaths}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields(fields) }),
  })
}

export async function createDocument(path, fields, documentId = '') {
  const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''
  return firestoreRequest(`${path}${query}`, {
    method: 'POST',
    body: JSON.stringify({ fields: encodeFields(fields) }),
  })
}

export async function deleteDocument(path) {
  return firestoreRequest(path, { method: 'DELETE' })
}

export async function findProjectByShareToken(shareToken) {
  const projects = await queryDocuments('projects', 'shareToken', shareToken, { limit: 1 })
  return projects[0] || null
}

export async function getProjectVideos(projectId, options = {}) {
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(0, Math.floor(options.maxItems)) : Infinity
  const orderBy = options.orderBy || (Number.isFinite(maxItems) ? 'createdAt desc, __name__ desc' : undefined)
  const videos = await listDocuments(`/projects/${encodeURIComponent(projectId)}/videos`, { maxItems, pageSize: Math.min(1000, maxItems === Infinity ? 1000 : Math.max(1, maxItems)), orderBy })
  return videos.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
}

export async function getVideoComments(projectId, videoId, options = {}) {
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(0, Math.floor(options.maxItems)) : Infinity
  const orderBy = options.orderBy || (Number.isFinite(maxItems) ? 'createdAt desc, __name__ desc' : undefined)
  const comments = await listDocuments(`/projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoId)}/comments`, { maxItems, pageSize: Math.min(1000, maxItems === Infinity ? 1000 : Math.max(1, maxItems)), orderBy })
  return comments.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
}
