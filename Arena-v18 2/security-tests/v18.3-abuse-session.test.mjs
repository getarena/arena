import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { consumeRateLimit, enforceBodySize, enforceSameOriginMutation } from '../api/lib/requestSecurity.js'
import { decodeIdTokenPayload, requireFirebaseUser } from '../api/lib/auth.js'

const reviewJs = fs.readFileSync(new URL('../api/review.js', import.meta.url), 'utf8')
const reviewApiJs = fs.readFileSync(new URL('../src/lib/reviewApi.js', import.meta.url), 'utf8')
const accountApiJs = fs.readFileSync(new URL('../src/lib/accountApi.js', import.meta.url), 'utf8')
const profileJs = fs.readFileSync(new URL('../src/components/Profile.jsx', import.meta.url), 'utf8')
const projectJs = fs.readFileSync(new URL('../api/project.js', import.meta.url), 'utf8')
const uploadSigJs = fs.readFileSync(new URL('../api/cloudinary-upload-signature.js', import.meta.url), 'utf8')

// Rate limiting is sliding-window and fails closed at the configured boundary.
const scope = `test-${crypto.randomUUID?.() || Math.random()}`
for (let i = 0; i < 3; i++) assert.equal(consumeRateLimit(scope, ['subject'], { limit: 3, windowMs: 60_000 }).allowed, true)
assert.equal(consumeRateLimit(scope, ['subject'], { limit: 3, windowMs: 60_000 }).allowed, false)
assert.equal(consumeRateLimit(scope, ['other'], { limit: 3, windowMs: 60_000 }).allowed, true)

assert.throws(() => enforceBodySize({ method: 'POST', headers: { 'content-length': '9000' }, body: '' }, 8192), (error) => error.status === 413 && error.code === 'request_too_large')
assert.throws(() => enforceSameOriginMutation({ headers: { origin: 'https://evil.example', host: 'arena.example', 'sec-fetch-site': 'cross-site' } }), (error) => error.status === 403 && error.code === 'cross_origin_request')

// The browser no longer sends review tokens in the API URL.
assert.ok(reviewApiJs.includes("'x-arena-review-token'"))
assert.ok(!/\/api\/review\?token=\$\{encodeURIComponent\(token\)\}/.test(reviewApiJs))
assert.ok(reviewJs.includes('getReviewToken'))
assert.ok(reviewJs.includes("'x-arena-review-token'"))
assert.ok(reviewJs.includes('REVIEW_AUTH_TOKEN_LIMIT'))
assert.ok(reviewJs.includes('MAX_PUBLIC_VIDEOS'))
assert.ok(reviewJs.includes('MAX_PUBLIC_COMMENTS'))
assert.ok(reviewJs.includes('enforceBodySize(request, MAX_REVIEW_BODY_BYTES)'))
assert.ok(reviewJs.includes('enforceSameOriginMutation(request)'))
assert.ok(reviewJs.includes('setReviewAccessCookies'))
assert.ok(reviewJs.includes('SameSite=Strict'))

// Account deletion requires both browser reauthentication and server-side recent-auth verification.
assert.ok(accountApiJs.includes('reauthenticateWithPopup'))
assert.ok(profileJs.includes('reauthenticateForSensitiveAction'))
assert.ok(accountApiJs.includes("'/api/account-delete'"))
const accountServerJs = fs.readFileSync(new URL('../api/account-delete.js', import.meta.url), 'utf8')
assert.ok(accountServerJs.includes('requireRecentAuth: true'))
assert.ok(accountServerJs.includes('enforceRateLimit'))
assert.ok(accountServerJs.includes('enforceSameOriginMutation'))

// Auth recent-login claim is decoded only after Firebase has accepted the ID token.
const payload = { sub: 'user-1', auth_time: Math.floor(Date.now() / 1000) }
const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
const token = `x.${encoded}.y`
assert.deepEqual(decodeIdTokenPayload(token), payload)

process.env.FIREBASE_API_KEY = 'test-key'
const originalFetch = globalThis.fetch
globalThis.fetch = async () => ({ ok: true, async json() { return { users: [{ localId: 'user-1', email: 'owner@example.com' }] } } })
const user = await requireFirebaseUser({ headers: { authorization: `Bearer ${token}` } }, { requireRecentAuth: true })
assert.equal(user.uid, 'user-1')
const stalePayload = { sub: 'user-1', auth_time: Math.floor(Date.now() / 1000) - 301 }
const staleToken = `x.${Buffer.from(JSON.stringify(stalePayload)).toString('base64url')}.y`
await assert.rejects(() => requireFirebaseUser({ headers: { authorization: `Bearer ${staleToken}` } }, { requireRecentAuth: true }), (error) => error.status === 401 && error.code === 'recent_auth_required')
globalThis.fetch = originalFetch

// Project and upload-signature endpoints now have abuse/race/request-size defenses.
assert.ok(projectJs.includes('enforceBodySize'))
assert.ok(projectJs.includes('enforceSameOriginMutation'))
assert.ok(projectJs.includes('actionLimits'))
assert.ok(uploadSigJs.includes('enforceRateLimit'))
assert.ok(uploadSigJs.includes('enforceBodySize'))
assert.ok(projectJs.includes('project-generic-uid'))

console.log('V18.3/V18.4 abuse + session security contract: PASS')
