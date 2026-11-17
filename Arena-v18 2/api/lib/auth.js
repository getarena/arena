/* global process */
import { DEFAULT_UPSTREAM_TIMEOUT_MS, maxHeaderLength } from './requestSecurity.js'

function decodeBase64UrlJson(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'))
}

export function decodeIdTokenPayload(idToken) {
  const parts = typeof idToken === 'string' ? idToken.split('.') : []
  if (parts.length !== 3) return null
  try { return decodeBase64UrlJson(parts[1]) } catch { return null }
}

export function getBearerToken(request) {
  const authorization = maxHeaderLength(request, 'authorization', 8192)
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i)
  return match?.[1] || ''
}

export async function requireFirebaseUser(request, options = {}) {
  const { requireRecentAuth = false, maxAuthAgeSeconds = 300 } = options
  const idToken = getBearerToken(request)
  if (!idToken) throw Object.assign(new Error('Please sign in again before continuing.'), { status: 401, code: 'auth_required' })

  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
  if (!apiKey) throw new Error('Firebase API key is not configured on the server.')

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(DEFAULT_UPSTREAM_TIMEOUT_MS),
  })

  if (!response.ok) {
    await response.text().catch(() => '')
    throw Object.assign(new Error('Your Arena session has expired. Please sign in again.'), { status: 401, code: 'auth_expired' })
  }

  const data = await response.json()
  const firebaseUser = data?.users?.[0]
  if (!firebaseUser?.localId) throw Object.assign(new Error('Authenticated Arena user was not found.'), { status: 401, code: 'auth_user_not_found' })

  const payload = decodeIdTokenPayload(idToken)
  if (!payload || payload.sub !== firebaseUser.localId) {
    throw Object.assign(new Error('Your Arena session could not be verified.'), { status: 401, code: 'auth_token_invalid' })
  }

  const authTime = Number(payload.auth_time)
  if (requireRecentAuth) {
    const now = Math.floor(Date.now() / 1000)
    if (!Number.isFinite(authTime) || authTime <= 0 || authTime > now + 30 || now - authTime > maxAuthAgeSeconds) {
      throw Object.assign(new Error('For your security, please confirm your Google account again before deleting your Arena account.'), { status: 401, code: 'recent_auth_required', requiresRecentAuth: true })
    }
  }

  return {
    uid: firebaseUser.localId,
    email: firebaseUser.email || '',
    idToken,
    authTime: Number.isFinite(authTime) ? authTime : null,
  }
}
