import { auth } from './firebase'

const SAFE_HTTP_MESSAGES = new Map([
  ['rate_limited', 'Too many requests. Please wait and try again.'],
  ['request_too_large', 'That request is too large.'],
  ['request_header_too_large', 'That request could not be verified.'],
  ['cross_origin_request', 'This action was blocked for security reasons.'],
  ['invalid_request_body', 'That request could not be processed.'],
  ['request_conflict', 'This request has already been used. Please try again.'],
  ['project_not_found', 'That project could not be found.'],
  ['version_not_found', 'That version could not be found.'],
  ['cloudinary_asset_mismatch', 'The uploaded video asset could not be verified.'],
  ['auth_required', 'Please sign in again before continuing.'],
  ['auth_expired', 'Your Arena session has expired. Please sign in again.'],
])

function safeResponseError(data, status) {
  const code = typeof data?.code === 'string' ? data.code : ''
  const message = SAFE_HTTP_MESSAGES.get(code) || (status === 429 ? 'Too many requests. Please wait and try again.' : 'Project service unavailable.')
  const error = new Error(message)
  error.status = status
  error.code = code || undefined
  return error
}

function randomRequestIdFallback() {
  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  const values = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return values || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export function newRequestId() {
  return globalThis.crypto?.randomUUID?.() || randomRequestIdFallback()
}

async function projectRequest(body) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Please sign in again before changing this project.')
  const idToken = await currentUser.getIdToken()
  const response = await fetch('/api/project', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw safeResponseError(data, response.status)
  return data
}

export function createProject(title, requestId = newRequestId()) {
  return projectRequest({ action: 'createProject', title, requestId })
}

export function cleanupUploadedAsset(publicId, assetId) {
  return projectRequest({ action: 'cleanupUpload', publicId, assetId })
}

export function deleteProject(projectId) { return projectRequest({ action: 'deleteProject', projectId }) }
export function deleteVersion(projectId, videoId) { return projectRequest({ action: 'deleteVersion', projectId, videoId }) }
export function setShareActive(projectId, active) { return projectRequest({ action: 'setShareActive', projectId, active }) }
export function setReviewPassword(projectId, password) { return projectRequest({ action: 'setReviewPassword', projectId, password }) }
export function clearReviewPassword(projectId) { return projectRequest({ action: 'clearReviewPassword', projectId }) }
export function createVersion(projectId, payload = {}) {
  return projectRequest({ action: 'createVersion', projectId, ...payload })
}
