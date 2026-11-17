/* global process */
import crypto from 'node:crypto'

const MAX_TRACKED_KEYS = 10000
const RATE_LIMIT_STORE_KEY = '__arenaRateLimitStoreV188'
const DEFAULT_UPSTREAM_TIMEOUT_MS = 10000

function getStore() {
  if (!globalThis[RATE_LIMIT_STORE_KEY]) globalThis[RATE_LIMIT_STORE_KEY] = new Map()
  return globalThis[RATE_LIMIT_STORE_KEY]
}

function getHeader(request, name) {
  const normalized = String(name).toLowerCase()
  return request.headers.get?.(normalized) || request.headers[normalized] || ''
}

function digestKey(scope, parts) {
  return crypto.createHash('sha256')
    .update([scope, ...parts.map((part) => String(part ?? ''))].join('|'))
    .digest('hex')
}

function pruneStore(store, now) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now || entry.timestamps.every((stamp) => stamp <= now - entry.windowMs)) store.delete(key)
  }
  if (store.size <= MAX_TRACKED_KEYS) return
  const oldest = [...store.entries()]
    .sort(([, a], [, b]) => a.updatedAt - b.updatedAt)
    .slice(0, Math.ceil(store.size - MAX_TRACKED_KEYS))
  for (const [key] of oldest) store.delete(key)
}

export function getClientIp(request) {
  const explicit = getHeader(request, 'x-real-ip')
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim().slice(0, 128)
  const forwarded = getHeader(request, 'x-forwarded-for')
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim().slice(0, 128)
  return 'unknown'
}

export function consumeRateLimit(scope, parts, { limit, windowMs }) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 1
  const safeWindowMs = Number.isFinite(windowMs) ? Math.max(1000, Math.floor(windowMs)) : 60000
  const now = Date.now()
  const store = getStore()
  pruneStore(store, now)
  const key = digestKey(scope, parts)
  let entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { timestamps: [], resetAt: now + safeWindowMs, windowMs: safeWindowMs, updatedAt: now }
    store.set(key, entry)
  }
  const cutoff = now - safeWindowMs
  entry.timestamps = entry.timestamps.filter((stamp) => stamp > cutoff)
  entry.updatedAt = now
  if (entry.timestamps.length >= safeLimit) {
    const retryAfterMs = Math.max(1000, entry.timestamps[0] + safeWindowMs - now)
    return { allowed: false, remaining: 0, retryAfterMs }
  }
  entry.timestamps.push(now)
  return { allowed: true, remaining: Math.max(0, safeLimit - entry.timestamps.length), retryAfterMs: 0 }
}

export function enforceRateLimit(response, scope, parts, config) {
  const result = consumeRateLimit(scope, parts, config)
  response.setHeader('X-RateLimit-Limit', String(Math.max(1, Math.floor(config.limit))))
  response.setHeader('X-RateLimit-Remaining', String(result.remaining))
  if (!result.allowed) {
    response.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)))
    const error = new Error('Too many requests. Please wait and try again.')
    error.status = 429
    error.code = 'rate_limited'
    throw error
  }
  return result
}

function contentLength(request) {
  const value = getHeader(request, 'content-length')
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function enforceBodySize(request, maxBytes) {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return
  const safeMaxBytes = Math.max(1, Math.floor(maxBytes))
  const declaredLength = contentLength(request)
  if (declaredLength > safeMaxBytes) {
    const error = new Error('Request body is too large.')
    error.status = 413
    error.code = 'request_too_large'
    throw error
  }

  if (typeof request.body === 'string' && Buffer.byteLength(request.body, 'utf8') > safeMaxBytes) {
    const error = new Error('Request body is too large.')
    error.status = 413
    error.code = 'request_too_large'
    throw error
  }
  if (request.body && typeof request.body === 'object') {
    try {
      if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > safeMaxBytes) {
        const error = new Error('Request body is too large.')
        error.status = 413
        error.code = 'request_too_large'
        throw error
      }
    } catch (error) {
      if (error?.status === 413) throw error
      const sizeError = new Error('Request body is invalid.')
      sizeError.status = 400
      sizeError.code = 'invalid_request_body'
      throw sizeError
    }
  }
}

export function isSameOriginMutation(request) {
  const fetchSite = String(getHeader(request, 'sec-fetch-site') || '').toLowerCase()
  if (fetchSite === 'cross-site') return false

  const origin = String(getHeader(request, 'origin') || '').trim()
  if (!origin) return true

  let originUrl
  try {
    originUrl = new URL(origin)
  } catch {
    return false
  }
  if (!['http:', 'https:'].includes(originUrl.protocol)) return false

  const configured = String(process.env.ARENA_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (configured.includes(originUrl.origin)) return true

  const proto = String(getHeader(request, 'x-forwarded-proto') || '')
    .split(',')[0]
    .trim() || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = String(getHeader(request, 'x-forwarded-host') || getHeader(request, 'host') || '')
    .split(',')[0]
    .trim()
  if (!host) return false
  try {
    return originUrl.origin === `${proto}://${host}`
  } catch {
    return false
  }
}

export function enforceSameOriginMutation(request) {
  if (!isSameOriginMutation(request)) {
    const error = new Error('Cross-origin requests are not allowed.')
    error.status = 403
    error.code = 'cross_origin_request'
    throw error
  }
}

function cookiePairs(request) {
  const raw = getHeader(request, 'cookie')
  return String(raw || '').split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function getCookie(request, name, maxLength = 4096) {
  const entry = cookiePairs(request).find((part) => part.startsWith(`${name}=`))
  if (!entry) return ''
  try {
    const value = decodeURIComponent(entry.slice(name.length + 1))
    return value.length <= maxLength ? value : ''
  } catch {
    return ''
  }
}

function secureCookieSuffix(request) {
  const forwardedProto = String(getHeader(request, 'x-forwarded-proto') || '').split(',')[0].trim()
  return process.env.NODE_ENV === 'production' || forwardedProto === 'https' ? '; Secure' : ''
}

export function setCookie(response, request, name, value, attributes = []) {
  const suffix = secureCookieSuffix(request)
  const cookie = `${name}=${encodeURIComponent(value)}; ${attributes.join('; ')}${suffix}`
  response.setHeader('Set-Cookie', cookie)
  return cookie
}

export function setCookies(response, request, cookies) {
  const suffix = secureCookieSuffix(request)
  const values = cookies.map(({ name, value, attributes = [] }) => `${name}=${encodeURIComponent(value)}; ${attributes.join('; ')}${suffix}`)
  response.setHeader('Set-Cookie', values)
  return values
}

function constantTimeStringEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function enforceCsrf(request, { headerName, cookieName }) {
  const supplied = maxHeaderLength(request, headerName, 256)
  const expected = getCookie(request, cookieName)
  if (!constantTimeStringEqual(supplied, expected)) {
    const error = new Error('This action could not be verified.')
    error.status = 403
    error.code = 'csrf_required'
    throw error
  }
}

export function maxHeaderLength(request, name, maxLength) {
  const value = String(getHeader(request, name) || '')
  if (value.length > maxLength) {
    const error = new Error('Request header is too large.')
    error.status = 400
    error.code = 'request_header_too_large'
    throw error
  }
  return value
}

export function applyCommonSecurityHeaders(response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'origin')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Strict-Transport-Security', 'max-age=31536000')
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  response.setHeader('Origin-Agent-Cluster', '?1')
}

export { DEFAULT_UPSTREAM_TIMEOUT_MS }
