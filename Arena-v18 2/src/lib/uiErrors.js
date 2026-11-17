export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  const code = error?.code || ''
  const message = String(error?.message || '')

  if (code.includes('permission-denied')) return 'Arena could not access that data. Your session may need to be refreshed.'
  if (code.includes('unauthenticated')) return 'Your Arena session has expired. Please sign in again.'
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'Arena could not reach the service. Check your connection and try again.'
  if (code.includes('network-request-failed') || /network/i.test(message)) return 'Network trouble interrupted that action. Check your connection and try again.'
  if (code === 'rate_limited') return 'Too many requests. Please wait and try again.'
  if (code === 'request_too_large') return 'That request is too large.'
  if (code === 'cross_origin_request') return 'This action was blocked for security reasons.'
  if (code === 'project_not_found') return 'That project could not be found.'
  if (code === 'version_not_found') return 'That version could not be found.'
  if (code === 'cloudinary_asset_mismatch') return 'The uploaded video asset could not be verified.'
  if (code === 'review_paused') return 'The project owner has paused this review link.'
  if (code === 'review_password_required') return 'This review is password protected.'
  if (code === 'review_not_found') return 'This review link is no longer available.'
  if (code.includes('not-found')) return 'That Arena item is no longer available.'
  if (/storage|quota/i.test(message)) return 'Your browser could not save this preference locally.'

  return fallback
}
