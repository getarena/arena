/* global process */
import crypto from 'node:crypto'
import { getServiceAccount } from './firestoreRest.js'

const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 7
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fromBase64Url(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function getSigningKey() {
  const account = getServiceAccount()
  return crypto.createHash('sha256').update(`${account.project_id}:${account.client_email}:${account.private_key}`).digest()
}

export function validateReviewPassword(password) {
  if (typeof password !== 'string') return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`
  }
  return ''
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, expectedHash) {
  if (typeof password !== 'string' || password.length === 0 || password.length > PASSWORD_MAX_LENGTH || !salt || !expectedHash) return false
  const actual = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, 'hex')
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected)
}

export function createReviewAccessToken(projectId, shareToken, version) {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS
  const payload = base64Url(JSON.stringify({ projectId, shareToken, version, exp: expiresAt }))
  const signature = base64Url(crypto.createHmac('sha256', getSigningKey()).update(payload).digest())
  return `${payload}.${signature}`
}

export function verifyReviewAccessToken(token, projectId, shareToken, version) {
  if (typeof token !== 'string' || token.length > 4096) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, signature] = parts
  if (!payload || !signature || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false
  const expectedSignature = base64Url(crypto.createHmac('sha256', getSigningKey()).update(payload).digest())
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false

  try {
    const decoded = JSON.parse(fromBase64Url(payload).toString('utf8'))
    return decoded.projectId === projectId && decoded.shareToken === shareToken && decoded.version === version && Number(decoded.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export const REVIEW_PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH
export const REVIEW_PASSWORD_MAX_LENGTH = PASSWORD_MAX_LENGTH
