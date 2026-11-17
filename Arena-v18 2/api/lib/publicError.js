const SAFE_MESSAGES = new Map([
  ['auth_required', 'Please sign in again before continuing.'],
  ['auth_expired', 'Your Arena session has expired. Please sign in again.'],
  ['auth_user_not_found', 'Your Arena account could not be found. Please sign in again.'],
  ['auth_token_invalid', 'Your Arena session could not be verified. Please sign in again.'],
  ['recent_auth_required', 'For your security, please confirm your Google account again before deleting your Arena account.'],
  ['rate_limited', 'Too many requests. Please wait and try again.'],
  ['request_too_large', 'Request body is too large.'],
  ['invalid_request_body', 'Invalid request.'],
  ['request_header_too_large', 'Request header is too large.'],
  ['request_conflict', 'That request has already been used.'],
  ['csrf_required', 'This action could not be verified.'],
  ['cross_origin_request', 'Cross-origin requests are not allowed.'],
  ['project_not_found', 'Project not found.'],
  ['version_not_found', 'That version could not be found.'],
  ['invalid_review_link', 'Invalid review link.'],
  ['review_not_found', 'This review link is no longer available.'],
  ['review_paused', 'This review link has been paused by the project owner.'],
  ['invalid_review_password', 'That review password is incorrect.'],
  ['review_password_required', 'This review requires its password.'],
  ['cloudinary_asset_mismatch', 'The uploaded video asset could not be verified.'],
])

export function safePublicError(error, fallback, fallbackStatus = 500) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : fallbackStatus
  const code = typeof error?.code === 'string' && SAFE_MESSAGES.has(error.code) ? error.code : ''
  const body = {
    error: code ? SAFE_MESSAGES.get(code) : (error?.expose === true ? String(error.message || fallback) : fallback),
  }
  if (code) body.code = code
  if (error?.requiresRecentAuth === true) body.requiresRecentAuth = true
  if (error?.requiresPassword === true) body.requiresPassword = true
  return { status, body }
}
