import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const projectJs = read('api/project.js')
const reviewJs = read('api/review.js')
const cloudSigJs = read('api/cloudinary-upload-signature.js')
const cloudClientJs = read('src/lib/cloudinary.js')
const firestoreJs = read('src/lib/firestore.js')
const uploadJs = read('src/components/Upload.jsx')
const clientViewJs = read('src/components/ClientView.jsx')
const rulesJs = read('firestore.rules')
const vercel = JSON.parse(read('vercel.json'))
const packageJson = JSON.parse(read('package.json'))
const packageLock = JSON.parse(read('package-lock.json'))

assert.equal(packageLock.lockfileVersion, 3)
for (const group of ['dependencies', 'devDependencies']) {
  for (const [name, spec] of Object.entries(packageJson[group] || {})) {
    assert.equal(spec, packageLock.packages[`node_modules/${name}`].version, `${name} must stay exactly pinned`)
  }
}

assert.match(projectJs, /action === 'createProject'/)
assert.match(projectJs, /crypto\.randomBytes\(32\)\.toString\('base64url'\)/)
assert.match(projectJs, /requestId/)
assert.match(projectJs, /createDocument\(\`\/\$\{PROJECT_COLLECTION\}\`[\s\S]*requestId/)
assert.match(projectJs, /hasOnlyKeys\(body, allowedKeys\[action\]\)/)
assert.match(projectJs, /isSafeDocumentId/)
assert.match(projectJs, /typeof body\.active !== 'boolean'/)
assert.match(projectJs, /asset\.type !== 'upload'/)
assert.match(projectJs, /asset\?\.bytes/)
assert.match(projectJs, /asset\?\.format/)
assert.match(projectJs, /asset\.secure_url !== videoUrl/)
assert.match(projectJs, /if \(sameVersionData\(existing, version\)\)/)
assert.match(projectJs, /status: 'pending',\n        statusReason: '',\n        statusUpdatedAt: new Date\(\)/)
const firestoreRestJs = read('api/lib/firestoreRest.js')
assert.match(firestoreRestJs, /queryDocuments\(collectionId, field, value, options = \{\}\)/)
assert.match(firestoreRestJs, /findProjectByShareToken\(shareToken\)[\s\S]*queryDocuments\('projects', 'shareToken', shareToken, \{ limit: 1 \}\)/)
assert.match(reviewJs, /latestVideo\?\.id === video\.id/)
assert.doesNotMatch(projectJs, /Boolean\(body\.active\)/)

assert.match(rulesJs, /allow create: if false;/)
assert.match(read('api/lib/requestSecurity.js'), /maxHeaderLength\(request, headerName, 256\)/)
assert.doesNotMatch(rulesJs, /allow create: if signedIn\(\)/)
assert.match(firestoreJs, /createProject as createProjectApi/)
const createProjectBlock = firestoreJs.slice(firestoreJs.indexOf('export const createProject'), firestoreJs.indexOf('export const getUserProjects'))
assert.doesNotMatch(createProjectBlock, /addDoc/)
assert.match(uploadJs, /createProject\(user\.uid, \{ title: projectTitle, requestId:/)
assert.doesNotMatch(uploadJs, /generateShareToken/)
const accountDeleteJs = read('api/account-delete.js')
assert.match(accountDeleteJs, /isPlainObject\(body\)/)
assert.match(accountDeleteJs, /hasOnlyKeys\(body, \['confirmation'\]\)/)

assert.doesNotMatch(reviewJs, /ARENA_ALLOW_LEGACY_QUERY_REVIEW_TOKEN/)
assert.doesNotMatch(reviewJs, /getQueryValue\(request, 'token'\)/)
assert.match(reviewJs, /enforceCsrf/)
assert.match(reviewJs, /maxHeaderLength\(request, 'x-arena-review-token', 256\)/)
assert.match(reviewJs, /SameSite=Strict/)
assert.match(reviewJs, /return json\(response, 200, \{ comment \}\)/)
assert.doesNotMatch(reviewJs, /const comments = await getVideoComments\(project\.id, video\.id/)
assert.match(reviewJs, /latestVideo\?\.id === video\.id/)
assert.match(reviewJs, /projectStatus/)

assert.match(cloudSigJs, /allowed_formats: ALLOWED_VIDEO_FORMATS/)
assert.match(cloudSigJs, /overwrite: false/)
assert.match(cloudClientJs, /formData\.append\('allowed_formats'/)
assert.match(cloudClientJs, /formData\.append\('overwrite'/)
assert.match(cloudClientJs, /resource_type.*video/s)
assert.match(cloudClientJs, /data\?\.bytes/)
assert.match(cloudClientJs, /data\?\.format/)
assert.match(cloudClientJs, /data\?\.asset_id/)
assert.match(cloudClientJs, /url: videoUrl,\s+videoUrl,/)

assert.match(clientViewJs, /result\?\.comment/)
assert.match(clientViewJs, /result\?\.projectStatus/)
assert.doesNotMatch(clientViewJs, /setComments\(\(result\.comments \|\| \[\]\)/)

for (const entry of vercel.headers.flatMap((item) => item.headers || [])) {
  if (entry.key === 'Strict-Transport-Security') assert.match(entry.value, /max-age=31536000/)
}
const vercelHeaders = new Map(vercel.headers.flatMap((item) => item.headers || []).map((item) => [item.key.toLowerCase(), item.value]))
assert.equal(vercelHeaders.get('x-frame-options'), 'DENY')
assert.equal(vercelHeaders.get('x-content-type-options'), 'nosniff')
assert.equal(vercelHeaders.get('x-permitted-cross-domain-policies'), 'none')
assert.equal(vercelHeaders.get('origin-agent-cluster'), '?1')

const { enforceCsrf, isSameOriginMutation } = await import(pathToFileURL(path.join(root, 'api/lib/requestSecurity.js')).href)
assert.throws(
  () => enforceCsrf({ headers: { 'x-arena-review-csrf': 'wrong', cookie: 'arena_review_csrf=expected' } }, { headerName: 'x-arena-review-csrf', cookieName: 'arena_review_csrf' }),
  (error) => error.status === 403 && error.code === 'csrf_required',
)
assert.doesNotThrow(() => enforceCsrf({ headers: { 'x-arena-review-csrf': 'expected', cookie: 'arena_review_csrf=expected' } }, { headerName: 'x-arena-review-csrf', cookieName: 'arena_review_csrf' }))
assert.equal(isSameOriginMutation({ headers: { origin: 'javascript:alert(1)', host: 'arena.example' } }), false)
assert.equal(isSameOriginMutation({ headers: { origin: 'https://evil.example', host: 'arena.example', 'sec-fetch-site': 'cross-site' } }), false)

const { isPlainObject, hasOnlyKeys, isSafeDocumentId, isSafeCloudinaryAssetId } = await import(pathToFileURL(path.join(root, 'api/lib/inputSecurity.js')).href)
const { parseArenaRoute, toSafeNavigationUrl, toSafeExternalNavigationUrl } = await import(pathToFileURL(path.join(root, 'src/lib/navigation.js')).href)
assert.equal(toSafeNavigationUrl('/settings', 'https://arena.example')?.href, 'https://arena.example/settings')
assert.equal(toSafeNavigationUrl('https://evil.example/path', 'https://arena.example'), null)
assert.equal(toSafeNavigationUrl('javascript:alert(1)', 'https://arena.example'), null)
assert.equal(toSafeExternalNavigationUrl('https://evil.example/path')?.href, 'https://evil.example/path')
assert.equal(toSafeExternalNavigationUrl('javascript:alert(1)'), null)
assert.deepEqual(parseArenaRoute('/projects/%E0%A4%A'), { type: 'not-found' })
assert.deepEqual(parseArenaRoute('/review-room/good-project', '?video=%E0%A4%A'), { type: 'creator-review', projectId: 'good-project', videoId: null })
assert.deepEqual(parseArenaRoute('/projects/good-project'), { type: 'project', projectId: 'good-project' })
assert.equal(parseArenaRoute('/projects/%2Fescape').type, 'not-found')
assert.equal(parseArenaRoute('/review/' + 'a'.repeat(44)).type, 'not-found')
assert.equal(parseArenaRoute('/review/' + 'a'.repeat(65)).type, 'not-found')
assert.equal(isPlainObject({ action: 'test' }), true)
assert.equal(isPlainObject([]), false)
assert.equal(hasOnlyKeys({ action: 'test', title: 'ok' }, ['action', 'title']), true)
assert.equal(hasOnlyKeys({ action: 'test', extra: 'forbidden' }, ['action']), false)
assert.equal(isSafeDocumentId('good-ID_123'), true)
assert.equal(isSafeDocumentId('../escape'), false)
assert.equal(isSafeCloudinaryAssetId('asset_123-ABC'), true)
assert.equal(isSafeCloudinaryAssetId('asset+123'), false)

const navigationJs = read('src/lib/navigation.js')
assert.match(navigationJs, /toSafeExternalNavigationUrl/)
assert.match(navigationJs, /return url\.origin === new URL\(baseOrigin\)\.origin \? url : null/)
assert.match(navigationJs, /openArenaInSameTab\(pathOrUrl\)/)
assert.doesNotMatch(read('.env.example'), /ARENA_ALLOW_LEGACY_QUERY_REVIEW_TOKEN/)
assert.match(read('.env.example'), /ARENA_ALLOWED_ORIGINS=/)
assert.match(read('README.md'), /The old `ARENA_ALLOW_LEGACY_QUERY_REVIEW_TOKEN` migration switch is not used by V18\.8/)

process.env.NODE_ENV = 'production'
process.env.FIREBASE_API_KEY = 'test-key'
process.env.CLOUDINARY_CLOUD_NAME = 'arena-test'
process.env.CLOUDINARY_API_KEY = 'cloud-key'
process.env.CLOUDINARY_API_SECRET = 'cloud-secret'
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  project_id: 'arena-test',
  client_email: 'arena@example.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
})

const { default: projectHandler } = await import(pathToFileURL(path.join(root, 'api/project.js')).href)
const { default: reviewHandler } = await import(pathToFileURL(path.join(root, 'api/review.js')).href)
const { hashPassword, createReviewAccessToken, verifyReviewAccessToken, verifyPassword } = await import(pathToFileURL(path.join(root, 'api/lib/reviewAccess.js')).href)
const { default: uploadSignatureHandler } = await import(pathToFileURL(path.join(root, 'api/cloudinary-upload-signature.js')).href)

function makeResponse() {
  const headers = new Map()
  const result = { statusCode: null, body: null, headers }
  return {
    setHeader(name, value) { headers.set(String(name).toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value)) },
    status(status) { result.statusCode = status; return this },
    json(body) { result.body = body; return result },
    result,
  }
}

function makeRequest({ method = 'POST', headers = {}, body = undefined, url = '/api/test' } = {}) {
  return { method, headers: new Headers(headers), body, url }
}

function signedToken(sub = 'user-adversary') {
  const payload = Buffer.from(JSON.stringify({ sub, auth_time: Math.floor(Date.now() / 1000) })).toString('base64url')
  return `x.${payload}.y`
}

let createdProject = {
  id: 'project-request-1', userId: 'user-adversary', title: 'My Project', shareToken: 'placeholder', status: 'pending', shareActive: true,
  reviewPasswordEnabled: false, reviewPasswordSalt: '', reviewPasswordHash: '', reviewPasswordVersion: '', createdAt: new Date().toISOString(),
}
let projectLookupCount = 0
let firestorePatchCalls = []
let commentCreateCount = 0
const projectId = 'project-adversarial'
const shareToken = crypto.randomBytes(32).toString('base64url')
const passwordState = hashPassword('correct-password')
const oversizedReviewToken = `${shareToken}${'x'.repeat(300)}`
assert.equal(verifyReviewAccessToken(createReviewAccessToken(projectId, shareToken, 'review-v1') + '.extra', projectId, shareToken, 'review-v1'), false)
assert.equal(verifyPassword('x'.repeat(129), passwordState.salt, passwordState.hash), false)
assert.equal(verifyReviewAccessToken(createReviewAccessToken(projectId, shareToken, 'review-v1') + '.extra', projectId, shareToken, 'review-v1'), false)
const projectData = () => ({
  id: projectId,
  userId: 'user-adversary',
  title: 'Adversarial Test',
  shareToken,
  shareActive: true,
  reviewPasswordEnabled: true,
  reviewPasswordSalt: passwordState.salt,
  reviewPasswordHash: passwordState.hash,
  reviewPasswordVersion: 'review-v1',
  status: 'approved',
  statusReason: 'latest decision',
  statusUpdatedAt: '2026-09-23T10:00:00.000Z',
})

function fsString(value) { return { stringValue: String(value) } }
function fsBool(value) { return { booleanValue: Boolean(value) } }
function fsTimestamp(value) { return { timestampValue: new Date(value).toISOString() } }
function fsNumber(value) { return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: Number(value) } }
function fsDoc(pathName, fields) {
  const encoded = Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    if (typeof value === 'string') return [key, fsString(value)]
    if (typeof value === 'boolean') return [key, fsBool(value)]
    if (value instanceof Date) return [key, fsTimestamp(value)]
    return [key, fsNumber(value)]
  }))
  return { name: `projects/arena-test/databases/(default)/documents${pathName}`, fields: encoded }
}

const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const target = String(url)
  if (target === 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
    const token = String(body.idToken || '')
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'))
    return { ok: true, status: 200, async json() { return { users: [{ localId: payload.sub, email: 'owner@example.com' }] } } }
  }
  if (target === 'https://oauth2.googleapis.com/token') {
    return { ok: true, status: 200, async json() { return { access_token: 'server-token', expires_in: 3600 } }, async text() { return '{}' } }
  }
  if (target.startsWith('https://api.cloudinary.com/v1_1/arena-test/resources/')) {
    return { ok: true, status: 200, async json() { return { asset_id: 'asset-adversarial', public_id: 'arena/user-adversary/asset-adversarial', resource_type: 'video', type: 'upload', bytes: 1000, format: 'mp4', duration: 42, secure_url: 'https://res.cloudinary.com/arena-test/video/upload/arena/user-adversary/asset-adversarial.mp4' } } }
  }
  if (target === 'https://api.cloudinary.com/v1_1/arena-test/video/destroy') {
    return { ok: true, status: 200, async json() { return { result: 'ok' } } }
  }
  if (target.startsWith('https://firestore.googleapis.com/')) {
    if (target.endsWith(':runQuery')) {
      const body = options.body ? JSON.parse(options.body) : {}
      const fieldPath = body?.structuredQuery?.where?.fieldFilter?.field?.fieldPath
      if (fieldPath === 'shareToken') return { ok: true, status: 200, async text() { return JSON.stringify([{ document: fsDoc(`/projects/${projectId}`, projectData()) }]) } }
      return { ok: true, status: 200, async text() { return '[]' } }
    }
    if (options.method === 'PATCH') {
      firestorePatchCalls.push({ url: target, body: JSON.parse(options.body || '{}') })
      return { ok: true, status: 200, async text() { return '{}' } }
    }
    if (target.includes('/projects/project-adversarial')) {
      if (target.endsWith(':runQuery')) {
        const body = options.body ? JSON.parse(options.body) : {}
        const fieldPath = body?.structuredQuery?.where?.fieldFilter?.field?.fieldPath
        if (fieldPath === 'shareToken') return { ok: true, status: 200, async text() { return JSON.stringify([{ document: fsDoc(`/projects/${projectId}`, projectData()) }]) } }
      }
      if (target.endsWith(`/projects/${projectId}`)) {
        return { ok: true, status: 200, async text() { return JSON.stringify({ name: `projects/arena-test/databases/(default)/documents/projects/${projectId}`, fields: Object.fromEntries(Object.entries(projectData()).filter(([key]) => key !== 'id').map(([key, value]) => [key, typeof value === 'boolean' ? fsBool(value) : fsString(value)])) }) } }
      }
      if (target.includes(`/projects/${projectId}/videos`)) {
        const videos = [
          fsDoc(`/projects/${projectId}/videos/old-video`, {
            title: 'Old', videoUrl: 'https://res.cloudinary.com/arena-test/video/upload/arena/user-adversary/old.mp4', publicId: 'arena/user-adversary/old', assetId: 'asset-old', duration: 42, createdAt: new Date('2026-09-23T09:00:00Z'), status: 'approved', statusReason: '',
          }),
          fsDoc(`/projects/${projectId}/videos/latest-video`, {
            title: 'Latest', videoUrl: 'https://res.cloudinary.com/arena-test/video/upload/arena/user-adversary/latest.mp4', publicId: 'arena/user-adversary/latest', assetId: 'asset-latest', duration: 42, createdAt: new Date('2026-09-23T10:00:00Z'), status: 'approved', statusReason: '',
          }),
        ]
        return { ok: true, status: 200, async text() { return JSON.stringify({ documents: videos }) } }
      }
    }
    const pathMatch = target.match(/\/projects\/([^/?]+)$/)
    if (pathMatch && pathMatch[1] === 'project-request-1') {
      if (projectLookupCount++ === 0) return { ok: false, status: 404, async text() { return '' } }
      return { ok: true, status: 200, async text() { return JSON.stringify(fsDoc('/projects/project-request-1', createdProject)) } }
    }
    if (target.includes('/projects/project-request-1/videos')) return { ok: true, status: 200, async text() { return JSON.stringify({ documents: [] }) } }
    if (options.method === 'POST' && target.includes('/documents?documentId=')) {
      if (target.includes('documentId=project-request-1')) {
        return { ok: true, status: 200, async text() { return JSON.stringify({ name: 'projects/arena-test/databases/(default)/documents/projects/project-request-1' }) } }
      }
      commentCreateCount += 1
      return { ok: true, status: 200, async text() { return JSON.stringify({ name: `projects/arena-test/databases/(default)/documents/projects/project-adversarial/videos/latest-video/comments/comment-${commentCreateCount}` }) } }
    }
    return { ok: true, status: 200, async text() { return '{}' } }
  }
  throw new Error(`Unexpected fetch in V18.8 adversarial test: ${target}`)
}

// Server-authoritative project creation is idempotent for the same request ID.
{
  const first = makeResponse()
  const result = await projectHandler(makeRequest({
    headers: { authorization: `Bearer ${signedToken()}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'createProject', title: 'My Project', requestId: 'project-request-1' }),
  }), first)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.projectId, 'project-request-1')
  assert.equal(result.body.replayed, false)
  assert.match(result.body.shareToken, /^[A-Za-z0-9_-]{43}$/)
  createdProject.shareToken = result.body.shareToken

  const replayResponse = makeResponse()
  const replay = await projectHandler(makeRequest({
    headers: { authorization: `Bearer ${signedToken()}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'createProject', title: 'My Project', requestId: 'project-request-1' }),
  }), replayResponse)
  assert.equal(replay.statusCode, 200)
  assert.equal(replay.body.replayed, true)
  assert.equal(replay.body.shareToken, createdProject.shareToken)

  const conflictResponse = makeResponse()
  const conflict = await projectHandler(makeRequest({
    headers: { authorization: `Bearer ${signedToken()}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'createProject', title: 'Different', requestId: 'project-request-1' }),
  }), conflictResponse)
  assert.equal(conflict.statusCode, 409)
  assert.equal(conflict.body.code, 'request_conflict')
}

// Boolean coercion cannot turn the string "false" into a real mutation.
{
  const response = makeResponse()
  const result = await projectHandler(makeRequest({
    headers: { authorization: `Bearer ${signedToken()}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ action: 'setShareActive', projectId: projectId, active: 'false' }),
  }), response)
  assert.equal(result.statusCode, 400)
  assert.equal(result.body.code, 'invalid_request_body')
}

// Review comment response contains only the new comment, not a full reread.
{
  const token = shareToken
  const access = createReviewAccessToken(projectId, token, 'review-v1')
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    headers: {
      'x-arena-review-token': token,
      cookie: `arena_review_access=${encodeURIComponent(access)}; arena_review_csrf=csrf-token`,
      'x-arena-review-csrf': 'csrf-token',
      origin: 'https://arena.example',
      host: 'arena.example',
    },
    body: JSON.stringify({ action: 'comment', videoId: 'latest-video', timestamp: 10, text: 'Please tighten this beat.', clientName: 'Reviewer', clientEmail: 'reviewer@example.com' }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.ok(result.body.comment)
  assert.equal(result.body.comments, undefined)
  assert.equal(result.body.comment.clientEmail, undefined)
}

// A review token is never truncated: valid-token prefixes with extra data are rejected.
{
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    headers: { 'x-arena-review-token': oversizedReviewToken, origin: 'https://arena.example', host: 'arena.example' },
    method: 'GET',
  }), response)
  assert.equal(result.statusCode, 400)
  assert.equal(result.body.code, 'request_header_too_large')
}

// A protected mutation fails without a matching CSRF token.
{
  const access = createReviewAccessToken(projectId, shareToken, 'review-v1')
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    headers: {
      'x-arena-review-token': shareToken,
      cookie: `arena_review_access=${encodeURIComponent(access)}; arena_review_csrf=csrf-token`,
      origin: 'https://arena.example',
      host: 'arena.example',
    },
    body: JSON.stringify({ action: 'decision', videoId: 'latest-video', status: 'approved' }),
  }), response)
  assert.equal(result.statusCode, 403)
  assert.equal(result.body.code, 'csrf_required')
}

// Old-version decisions update that version only; the project summary changes only for latest.
firestorePatchCalls = []
{
  const access = createReviewAccessToken(projectId, shareToken, 'review-v1')
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    headers: {
      'x-arena-review-token': shareToken,
      cookie: `arena_review_access=${encodeURIComponent(access)}; arena_review_csrf=csrf-token`,
      'x-arena-review-csrf': 'csrf-token',
      origin: 'https://arena.example',
      host: 'arena.example',
    },
    body: JSON.stringify({ action: 'decision', videoId: 'old-video', status: 'changes_requested', reason: 'Old cut needs another pass.' }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.videoId, 'old-video')
  assert.equal(result.body.projectStatus, 'approved')
  assert.equal(firestorePatchCalls.length, 1)
  assert.match(firestorePatchCalls[0].url, /\/videos\/old-video\?/) 
}

firestorePatchCalls = []
{
  const access = createReviewAccessToken(projectId, shareToken, 'review-v1')
  const response = makeResponse()
  const result = await reviewHandler(makeRequest({
    headers: {
      'x-arena-review-token': shareToken,
      cookie: `arena_review_access=${encodeURIComponent(access)}; arena_review_csrf=csrf-token`,
      'x-arena-review-csrf': 'csrf-token',
      origin: 'https://arena.example',
      host: 'arena.example',
    },
    body: JSON.stringify({ action: 'decision', videoId: 'latest-video', status: 'approved' }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.projectStatus, 'approved')
  assert.equal(firestorePatchCalls.length, 2)
  assert.ok(firestorePatchCalls.some((call) => /\/videos\/latest-video\?/.test(call.url)))
  assert.ok(firestorePatchCalls.some((call) => /\/projects\/project-adversarial\?/.test(call.url)))
}

// Upload signatures bind format allowlisting and overwrite protection into the signature.
{
  const response = makeResponse()
  const result = await uploadSignatureHandler(makeRequest({
    headers: { authorization: `Bearer ${signedToken('upload-user')}`, origin: 'https://arena.example', host: 'arena.example' },
    body: JSON.stringify({ fileName: 'cut.mp4', fileSize: 1024 }),
  }), response)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.allowedFormats, 'mp4,mov,avi')
  assert.equal(result.body.overwrite, false)
  assert.equal(result.body.maxBytes, 100 * 1024 * 1024)
  const params = {
    allowed_formats: result.body.allowedFormats,
    folder: result.body.folder,
    overwrite: result.body.overwrite,
    public_id: result.body.publicId,
    timestamp: result.body.timestamp,
  }
  const serialized = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')
  const expected = crypto.createHash('sha1').update(`${serialized}${process.env.CLOUDINARY_API_SECRET}`).digest('hex')
  assert.equal(result.body.signature, expected)
}

globalThis.fetch = originalFetch
console.log('V18.8 adversarial security checks: PASS')
