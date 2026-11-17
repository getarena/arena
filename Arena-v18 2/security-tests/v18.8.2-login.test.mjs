import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const firebase = read('src/lib/firebase.js')
for (const name of ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID']) {
  assert.match(firebase, new RegExp(name.replaceAll('_', '\\_')), `${name} must be wired into Firebase config`)
}
assert.match(firebase, /initializeApp\(firebaseConfig\)/)
assert.match(firebase, /getAuth\(app\)/)

const login = read('src/components/Login.jsx')
assert.match(login, /signInWithPopup\(auth, provider\)/)
for (const code of ['auth/invalid-api-key','auth/internal-error','auth/invalid-oauth-client-id','auth/configuration-not-found']) {
  assert.match(login, new RegExp(code.replaceAll('/', '\\/')), `${code} must have a user-facing login mapping`)
}

const vercel = JSON.parse(read('vercel.json'))
const headers = vercel.headers.flatMap((entry) => entry.headers || [])
const csp = headers.find((entry) => String(entry.key).toLowerCase() === 'content-security-policy')?.value || ''
for (const origin of ['https://apis.google.com','https://www.gstatic.com','https://accounts.google.com','https://oauth2.googleapis.com']) {
  assert.match(csp, new RegExp(origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${origin} must be allowed by the auth CSP`)
}
assert.match(csp, /script-src 'self' https:\/\/apis\.google\.com https:\/\/www\.gstatic\.com/)
assert.doesNotMatch(csp, /script-src[^;]*unsafe-eval/)

console.log('V18.8.2 Google login/CSP security contract: PASS')
