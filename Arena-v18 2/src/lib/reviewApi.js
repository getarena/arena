const SAFE_HTTP_MESSAGES = new Map([
  ['rate_limited', 'Too many requests. Please wait and try again.'],
  ['request_too_large', 'That request is too large.'],
  ['request_header_too_large', 'That request could not be verified.'],
  ['cross_origin_request', 'This action was blocked for security reasons.'],
  ['invalid_request_body', 'That review request could not be processed.'],
  ['csrf_required', 'This review session needs to be refreshed for security. Reload and try again.'],
  ['invalid_review_link', 'This review link is not valid.'],
  ['review_not_found', 'This review link is no longer available.'],
  ['review_paused', 'The project owner has paused this review link.'],
  ['invalid_review_password', 'That review password is incorrect.'],
  ['review_password_required', 'This review is password protected.'],
  ['version_not_found', 'That version could not be found.'],
])

function createSafeResponseError(data, status, fallback) {
  const code = typeof data?.code === 'string' ? data.code : ''
  const message = SAFE_HTTP_MESSAGES.get(code) || (status === 429 ? 'Too many requests. Please wait and try again.' : fallback)
  const error = new Error(message)
  error.status = status
  error.code = code || undefined
  error.requiresPassword = data?.requiresPassword === true
  return error
}

function getCsrfCookie() {
  if (typeof document === 'undefined') return ''
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('arena_review_csrf='))
  if (!entry) return ''
  try { return decodeURIComponent(entry.slice('arena_review_csrf='.length)) } catch { return '' }
}

async function requestReview(path, options = {}, reviewToken = '') {
  const method = String(options.method || 'GET').toUpperCase()
  const csrfToken = method === 'POST' ? getCsrfCookie() : ''
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(reviewToken ? { 'x-arena-review-token': reviewToken } : {}),
    ...(csrfToken ? { 'x-arena-review-csrf': csrfToken } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(path, {
    ...options,
    method,
    cache: 'no-store',
    credentials: 'include',
    headers,
  })

  let data = null
  try { data = await response.json() } catch { /* no-op */ }
  if (!response.ok) throw createSafeResponseError(data, response.status, 'Review service unavailable.')
  return data
}

export async function loadReview(token) {
  return requestReview('/api/review', {}, token)
}

export async function authenticateReview(token, password) {
  return requestReview('/api/review', {
    method: 'POST',
    body: JSON.stringify({ action: 'authenticate', password }),
  }, token)
}

export async function loadReviewComments(token, videoId) {
  const data = await requestReview(`/api/review?videoId=${encodeURIComponent(videoId)}`, {}, token)
  return data.comments || []
}

export async function postReviewComment(token, data) {
  return requestReview('/api/review', {
    method: 'POST',
    body: JSON.stringify({ action: 'comment', ...data }),
  }, token)
}

export async function submitReviewDecision(token, data) {
  return requestReview('/api/review', {
    method: 'POST',
    body: JSON.stringify({ action: 'decision', ...data }),
  }, token)
}
