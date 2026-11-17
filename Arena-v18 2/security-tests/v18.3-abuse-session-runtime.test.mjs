import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { hashPassword } from '../api/lib/reviewAccess.js'
import reviewHandler from '../api/review.js'
import projectHandler from '../api/project.js'
import uploadSignatureHandler from '../api/cloudinary-upload-signature.js'
import accountDeleteHandler from '../api/account-delete.js'

process.env.NODE_ENV = 'production'
process.env.FIREBASE_API_KEY = 'test-key'
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  project_id: 'arena-test',
  client_email: 'arena@example.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
})

function makeResponse() {
  const headers = new Map()
  const result = { statusCode: null, body: null, headers }
  return {
    setHeader(name, value) { headers.set(String(name).toLowerCase(), String(value)) },
    status(status) { result.statusCode = status; return this },
    json(body) { result.body = body; return result },
    result,
  }
}

function makeRequest({ method = 'GET', headers = {}, body = undefined, url = '/api/review' } = {}) {
  return { method, headers: new Headers(headers), body, url }
}

function fsString(value) { return { stringValue: String(value) } }
function fsBool(value) { return { booleanValue: Boolean(value) } }
function fsTimestamp(value) { return { timestampValue: new Date(value).toISOString() } }
function fsNumber(value) { return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: Number(value) } }
function fsDoc(path, fields) {
  const encoded = Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    if (typeof value === 'string') return [key, fsString(value)]
    if (typeof value === 'boolean') return [key, fsBool(value)]
    if (value instanceof Date) return [key, fsTimestamp(value)]
    return [key, fsNumber(value)]
  }))
  return { name: `projects/arena-test/databases/(default)/documents${path}`, fields: encoded }
}

const originalFetch = globalThis.fetch
const shareToken = crypto.randomBytes(32).toString('base64url').slice(0, 43)
const { salt, hash } = hashPassword('correct-password')
let project = {
  title: 'Security Test Project',
  shareToken,
  shareActive: true,
  reviewPasswordEnabled: true,
  reviewPasswordSalt: salt,
  reviewPasswordHash: hash,
  reviewPasswordVersion: 'v1',
  status: 'pending',
  statusReason: '',
  statusUpdatedAt: null,
}

function videoDoc() {
  return fsDoc(`/projects/project-1/videos/video-1`, {
    title: 'V1',
    videoUrl: 'https://res.cloudinary.com/arena-test/video/upload/v1/arena/u/video.mp4',
    publicId: 'arena/u/video',
    assetId: 'asset-1',
    duration: 60,
    createdAt: new Date('2026-09-23T10:00:00Z'),
    status: 'pending',
    statusReason: '',
  })
}

globalThis.fetch = async (url, options = {}) => {
  const target = String(url)
  if (target === 'https://oauth2.googleapis.com/token') {
    return { ok: true, status: 200, async text() { return JSON.stringify({ access_token: 'server-token', expires_in: 3600 }) }, async json() { return { access_token: 'server-token', expires_in: 3600 } } }
  }
  if (target.startsWith('https://firestore.googleapis.com/')) {
    if (target.endsWith(':runQuery')) {
      return { ok: true, status: 200, async text() { return JSON.stringify([{ document: fsDoc('/projects/project-1', project) }]) } }
    }
    if (target.includes('/projects/project-1/videos')) {
      return { ok: true, status: 200, async text() { return JSON.stringify({ documents: [videoDoc()] }) } }
    }
    return { ok: true, status: 200, async text() { return '{}' } }
  }
  if (target === 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
    const token = String(body.idToken || '')
    const parts = token.split('.')
    const payload = parts[1] ? JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) : {}
    return { ok: true, status: 200, async json() { return { users: [{ localId: payload.sub || 'user-1', email: 'owner@example.com' }] } } }
  }
  throw new Error(`Unexpected fetch in runtime test: ${target}`)
}

// 1. Public review GET works with the new header transport and does not need token in the URL.
{
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({ headers: { 'x-arena-review-token': shareToken, host: 'arena.example' } }), response)
  assert.equal(result.statusCode, 401)
  assert.equal(result.body.code, 'review_password_required')
}

// 2. Password brute-force attempts are throttled before a sixth attempt can be checked.
for (let i = 0; i < 5; i++) {
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    method: 'POST',
    headers: { 'x-arena-review-token': shareToken, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'authenticate', password: 'wrong-password' }),
  }), response)
  assert.equal(result.statusCode, 401)
}
{
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    method: 'POST',
    headers: { 'x-arena-review-token': shareToken, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'authenticate', password: 'wrong-password' }),
  }), response)
  assert.equal(result.statusCode, 429)
  assert.equal(result.body.code, 'rate_limited')
  assert.ok(result.headers.has('retry-after'))
}

// 3. A fresh share token gets a fresh limiter bucket, and the access cookie is Secure in production.
const secondToken = crypto.randomBytes(32).toString('base64url').slice(0, 43)
project = { ...project, shareToken: secondToken, reviewPasswordVersion: 'v2' }
{
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    method: 'POST',
    headers: { 'x-arena-review-token': secondToken, origin: 'https://arena.example', host: 'arena.example', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ action: 'authenticate', password: 'correct-password' }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.match(result.headers.get('set-cookie'), /Secure/)
  assert.match(result.headers.get('set-cookie'), /HttpOnly/)
  assert.match(result.headers.get('set-cookie'), /SameSite=Strict/)
}

// 4. Cross-origin authenticated mutations are blocked before auth/side effects.
{
  const response = makeResponse()
  const result = await projectHandler(makeRequest({
    method: 'POST',
    headers: { origin: 'https://evil.example', host: 'arena.example', 'sec-fetch-site': 'cross-site' },
    body: JSON.stringify({ action: 'setShareActive', projectId: 'project-1', active: false }),
  }), response)
  assert.equal(result.statusCode, 403)
  assert.equal(result.body.code, 'cross_origin_request')
}

// 5. Oversized request bodies are rejected before application logic.
{
  const response = makeResponse()
  const result = await uploadSignatureHandler(makeRequest({
    method: 'POST',
    headers: { 'content-length': '9000' },
    body: '{}',
  }), response)
  assert.equal(result.statusCode, 413)
  assert.equal(result.body.code, 'request_too_large')
}

// 6. Stale Firebase auth_time is rejected by account deletion before any Firestore cleanup.
{
  const stalePayload = { sub: 'user-1', auth_time: Math.floor(Date.now() / 1000) - 301 }
  const encoded = Buffer.from(JSON.stringify(stalePayload)).toString('base64url')
  const staleToken = `x.${encoded}.y`
  const response = makeResponse()
  const result = await accountDeleteHandler(makeRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${staleToken}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
  }), response)
  assert.equal(result.statusCode, 401)
  assert.equal(result.body.code, 'recent_auth_required')
  assert.equal(result.body.requiresRecentAuth, true)
}

// 7. Account deletion rejects extra body fields before any workspace cleanup.
{
  const freshPayload = { sub: 'user-1', auth_time: Math.floor(Date.now() / 1000) }
  const encoded = Buffer.from(JSON.stringify(freshPayload)).toString('base64url')
  const freshToken = `x.${encoded}.y`
  const response = makeResponse()
  const result = await accountDeleteHandler(makeRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${freshToken}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT', extra: 'forbidden' }),
  }), response)
  assert.equal(result.statusCode, 400)
  assert.equal(result.body.code, 'invalid_request_body')
}

// 8. Fresh auth_time reaches the deletion flow; with no projects, only the final Auth deletion call remains.
{
  const freshPayload = { sub: 'user-1', auth_time: Math.floor(Date.now() / 1000) }
  const encoded = Buffer.from(JSON.stringify(freshPayload)).toString('base64url')
  const freshToken = `x.${encoded}.y`
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url)
    if (target === 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key') {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
      const token = String(body.idToken || '')
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
      return { ok: true, status: 200, async json() { return { users: [{ localId: payload.sub, email: 'owner@example.com' }] } } }
    }
    if (target.startsWith('https://firestore.googleapis.com/')) {
      if (target.endsWith(':runQuery')) return { ok: true, status: 200, async text() { return '[]' } }
      return { ok: true, status: 200, async text() { return '{}' } }
    }
    if (target === 'https://identitytoolkit.googleapis.com/v1/accounts:delete?key=test-key') {
      return { ok: true, status: 200, async json() { return {} } }
    }
    throw new Error(`Unexpected fetch in fresh account deletion test: ${target}`)
  }
  const response = makeResponse()
  const result = await accountDeleteHandler(makeRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${freshToken}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.deletedProjects, 0)
}

globalThis.fetch = originalFetch
console.log('V18.3/V18.4 handler runtime security tests: PASS')
