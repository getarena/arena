import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const readJson = (p) => JSON.parse(read(p))

function collectFiles(directory, extensions) {
  const result = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (extensions.some((ext) => entry.name.endsWith(ext))) result.push(full)
    }
  }
  walk(directory)
  return result
}

const vercel = readJson('vercel.json')
assert.equal(Array.isArray(vercel.headers), true, 'Vercel security headers must be configured')
const allHeaders = vercel.headers.flatMap((entry) => entry.headers || [])
const headers = new Map(allHeaders.map((entry) => [String(entry.key).toLowerCase(), entry.value]))
for (const key of ['content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy','cross-origin-resource-policy','strict-transport-security','x-permitted-cross-domain-policies','origin-agent-cluster']) {
  assert.ok(headers.has(key), `Missing ${key}`)
}
const csp = headers.get('content-security-policy')
assert.match(csp, /frame-ancestors 'none'/)
assert.match(csp, /script-src 'self'/)
assert.doesNotMatch(csp, /script-src[^;]*unsafe-eval/)
assert.match(csp, /https:\/\/api\.cloudinary\.com/)
assert.match(csp, /https:\/\/res\.cloudinary\.com/)
assert.match(csp, /https:\/\/identitytoolkit\.googleapis\.com/)
assert.match(csp, /https:\/\/accounts\.google\.com/)

const navigation = read('src/lib/navigation.js')
assert.match(navigation, /toSafeNavigationUrl/)
assert.match(navigation, /\['http:', 'https:'\]/)
assert.doesNotMatch(navigation, /window\.location\.assign\(String\(pathOrUrl\)\)/)

const reviewApi = read('src/lib/reviewApi.js')
assert.match(reviewApi, /x-arena-review-token/)
assert.match(reviewApi, /cache: 'no-store'/)
assert.match(reviewApi, /credentials: 'include'/)
assert.doesNotMatch(reviewApi, /error\.details\s*=\s*data/)
assert.doesNotMatch(reviewApi, /JSON\.stringify\(\{ token, action: 'authenticate'/)
const reviewServer = read('api/review.js')
assert.doesNotMatch(reviewServer, /ARENA_ALLOW_LEGACY_QUERY_REVIEW_TOKEN/)
assert.match(reviewServer, /maxHeaderLength\(request, 'x-arena-review-token', 256\)/)
assert.match(read('api/lib/requestSecurity.js'), /maxHeaderLength\(request, headerName, 256\)/)
assert.match(reviewServer, /SameSite=Strict/)
assert.match(reviewServer, /x-arena-review-csrf/)
assert.match(reviewServer, /function publicComment\(comment\)/)
const commentStart = reviewServer.indexOf('function publicComment')
const commentEnd = reviewServer.indexOf('function getReviewAccessToken', commentStart)
const commentBlock = reviewServer.slice(commentStart, commentEnd)
assert.doesNotMatch(commentBlock, /clientEmail/)
assert.match(reviewServer, /return json\(response, 200, \{ comment \}\)/)


const { toSafeNavigationUrl } = await import(pathToFileURL(path.join(root, 'src/lib/navigation.js')).href)
assert.equal(toSafeNavigationUrl('/settings', 'https://arena.example')?.href, 'https://arena.example/settings')
assert.equal(toSafeNavigationUrl('https://arena.example/review/demo', 'https://arena.example')?.href, 'https://arena.example/review/demo')
for (const unsafe of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)']) {
  assert.equal(toSafeNavigationUrl(unsafe, 'https://arena.example'), null, `Unsafe navigation scheme accepted: ${unsafe}`)
}

const { safePublicError } = await import(pathToFileURL(path.join(root, 'api/lib/publicError.js')).href)
assert.deepEqual(safePublicError(Object.assign(new Error('database password=secret'), { status: 500 }), 'Something went wrong.'), {
  status: 500,
  body: { error: 'Something went wrong.' },
})
assert.deepEqual(safePublicError(Object.assign(new Error('internal'), { status: 429, code: 'rate_limited' }), 'Something went wrong.'), {
  status: 429,
  body: { error: 'Too many requests. Please wait and try again.', code: 'rate_limited' },
})

const reviewApiModule = await import(pathToFileURL(path.join(root, 'src/lib/reviewApi.js')).href)
const originalFetch = globalThis.fetch
let capturedFetch = null
globalThis.fetch = async (url, options) => {
  capturedFetch = { url, options }
  return { ok: true, status: 200, async json() { return { ok: true } } }
}
try {
  await reviewApiModule.authenticateReview('review-secret-token', 'correct-password')
} finally {
  globalThis.fetch = originalFetch
}
assert.equal(capturedFetch.url, '/api/review')
assert.equal(capturedFetch.options.headers['x-arena-review-token'], 'review-secret-token')
assert.equal(capturedFetch.options.cache, 'no-store')
assert.equal(capturedFetch.options.credentials, 'include')
assert.deepEqual(JSON.parse(capturedFetch.options.body), { action: 'authenticate', password: 'correct-password' })
assert.doesNotMatch(capturedFetch.options.body, /review-secret-token/)

const profile = read('src/components/Profile.jsx')
assert.doesNotMatch(profile, /localStorage\.clear\(\)/)
assert.match(profile, /startsWith\('arena:'\)/)

const storedReviewer = read('src/components/ClientView.jsx')
assert.match(storedReviewer, /JSON\.stringify\(\{ name \}\)/)
assert.match(storedReviewer, /return \{ name, email: '' \}/)

const accountDeleteServer = read('api/account-delete.js')
assert.match(accountDeleteServer, /hasOnlyKeys\(body, \['confirmation'\]\)/)

for (const apiFile of ['api/review.js','api/project.js','api/cloudinary-upload-signature.js','api/account-delete.js']) {
  const source = read(apiFile)
  assert.match(source, /safePublicError/, `${apiFile} must sanitize unexpected responses`)
  assert.doesNotMatch(source, /return json\([^\n]*error\?\.message/)
}

for (const helper of ['api/lib/firestoreRest.js','api/lib/cloudinary.js','api/account-delete.js']) {
  const source = read(helper)
  assert.doesNotMatch(source, /console\.error\([^\n]*(body|text|data)\)/, `${helper} must not log provider response bodies`)
}

for (const directory of [path.join(root, 'src'), path.join(root, 'api')]) {
  for (const sourceFile of collectFiles(directory, ['.js', '.jsx'])) {
    const source = fs.readFileSync(sourceFile, 'utf8')
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML|eval\(|new Function\(|document\.write\(/, `Dangerous sink found in ${path.relative(root, sourceFile)}`)
  }
}

console.log('V18.5/V18.6 security checks passed.')
