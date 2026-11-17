/**
 * Arena navigation helpers.
 *
 * Core workspace routes and review routes stay in the current tab.
 * Informational/legal destinations may opt into a separate tab.
 */

export const APP_PATHS = {
  dashboard: '/projects',
  reviews: '/reviews',
  activity: '/activity',
  profile: '/profile',
  settings: '/settings',
  upload: '/upload',
}

export function projectPath(projectId) {
  return projectId ? `/projects/${encodeURIComponent(projectId)}` : APP_PATHS.dashboard
}

export function creatorReviewPath(projectId, videoId = null) {
  if (!projectId) return '/reviews'
  const path = `/review-room/${encodeURIComponent(projectId)}`
  return videoId ? `${path}?video=${encodeURIComponent(videoId)}` : path
}

export function clientReviewPath(shareToken) {
  return shareToken ? `/review/${encodeURIComponent(shareToken)}` : '/'
}

export function uploadPath(projectId = '') {
  return projectId ? `/upload?project=${encodeURIComponent(projectId)}` : APP_PATHS.upload
}

export function workspacePathForView(view) {
  return APP_PATHS[view] || APP_PATHS.dashboard
}

function decodeSafeId(value, maxLength = 150) {
  try {
    const decoded = decodeURIComponent(value)
    return /^[A-Za-z0-9_-]+$/.test(decoded) && decoded.length <= maxLength ? decoded : ''
  } catch {
    return ''
  }
}

export function parseArenaRoute(pathname, search = (typeof window !== 'undefined' ? window.location.search : '')) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(search || '')

  if (path === '/') return { type: 'landing' }
  if (path === '/login') return { type: 'login' }
  if (path === '/dashboard' || path === '/projects') return { type: 'dashboard' }
  if (path === '/reviews') return { type: 'reviews' }
  if (path === '/activity') return { type: 'activity' }
  if (path === '/profile') return { type: 'profile' }
  if (path === '/settings') return { type: 'settings' }
  if (path === '/upload') {
    const projectId = params.get('project') || ''
    return { type: 'upload', projectId: decodeSafeId(projectId) }
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)$/)
  if (projectMatch) {
    const projectId = decodeSafeId(projectMatch[1])
    return projectId ? { type: 'project', projectId } : { type: 'not-found' }
  }

  const creatorReviewMatch = path.match(/^\/review-room\/([^/]+)$/)
  if (creatorReviewMatch) {
    const projectId = decodeSafeId(creatorReviewMatch[1])
    const videoId = params.get('video') ? decodeSafeId(params.get('video')) : null
    return projectId ? { type: 'creator-review', projectId, videoId: videoId || null } : { type: 'not-found' }
  }

  const clientReviewMatch = path.match(/^\/review\/([^/]+)$/)
  if (clientReviewMatch) {
    const shareToken = decodeSafeId(clientReviewMatch[1], 43)
    return shareToken.length === 43 ? { type: 'client-review', shareToken } : { type: 'not-found' }
  }

  // Informational/legal destinations. These are intentionally separate from
  // the authenticated workspace shell and are safe to open directly.
  const publicInfo = new Set(['/about', '/privacy', '/terms', '/acceptable-use', '/security', '/help', '/contact'])
  if (publicInfo.has(path)) return { type: 'public-info', path }

  return { type: 'not-found' }
}

export function pushArenaPath(path, { replace = false } = {}) {
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({ arenaPath: path }, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}


function parseHttpUrl(pathOrUrl, baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost') {
  if (!pathOrUrl) return null
  try {
    const url = new URL(String(pathOrUrl), baseOrigin)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url
  } catch {
    return null
  }
}

export function toSafeNavigationUrl(pathOrUrl, baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost') {
  const url = parseHttpUrl(pathOrUrl, baseOrigin)
  if (!url) return null
  try {
    return url.origin === new URL(baseOrigin).origin ? url : null
  } catch {
    return null
  }
}

export function toSafeExternalNavigationUrl(pathOrUrl) {
  return parseHttpUrl(pathOrUrl)
}

export function openArenaInSameTab(pathOrUrl) {
  const url = toSafeNavigationUrl(pathOrUrl)
  if (!url) return false
  pushArenaPath(`${url.pathname}${url.search}${url.hash}`)
  return true
}

export function openArenaInNewTab(pathOrUrl) {
  const url = toSafeExternalNavigationUrl(pathOrUrl)
  if (!url) return null
  const opened = window.open(url.href, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
  return opened
}
