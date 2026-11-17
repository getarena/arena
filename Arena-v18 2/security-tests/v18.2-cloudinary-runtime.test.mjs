import assert from 'node:assert/strict'
import { destroyVideoAsset, getCloudinaryAssetById, isOwnedCloudinaryPublicId } from '../api/lib/cloudinary.js'

process.env.CLOUDINARY_CLOUD_NAME = 'arena-test'
process.env.CLOUDINARY_API_KEY = 'key'
process.env.CLOUDINARY_API_SECRET = 'secret'

let calls = []
const originalFetch = globalThis.fetch

// 1) Cross-user reference must be rejected before any network call.
globalThis.fetch = async () => { calls.push('unexpected'); throw new Error('should not fetch') }
const rejected = await destroyVideoAsset({ publicId: 'arena/victim/asset123', assetId: 'victimAsset' }, 'attacker')
assert.equal(rejected.skipped, true)
assert.equal(rejected.reason, 'untrusted_asset_reference')
assert.deepEqual(calls, [])

// 2) Matching immutable asset ID + owner namespace may proceed, and deletion is by asset_id.
calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  if (options.method === 'GET') {
    return { status: 200, ok: true, async json() { return { asset_id: 'asset123', public_id: 'arena/attacker/asset123', resource_type: 'video' } } }
  }
  return { status: 200, ok: true, async json() { return { result: 'ok' } } }
}
const deleted = await destroyVideoAsset({ publicId: 'arena/attacker/asset123', assetId: 'asset123' }, 'attacker')
assert.equal(deleted.skipped, false)
assert.equal(deleted.assetId, 'asset123')
assert.equal(calls.length, 2)
assert.match(calls[0].url, /\/resources\/asset123$/)
assert.equal(calls[1].options.method, 'POST')
const body = String(calls[1].options.body)
assert.match(body, /asset_id=asset123/)
assert.ok(!body.includes('public_id='))

// 3) A mismatched asset ID must fail closed and never issue the destroy call.
calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return { status: 200, ok: true, async json() { return { asset_id: 'asset123', public_id: 'arena/victim/asset123', resource_type: 'video' } } }
}
const mismatch = await destroyVideoAsset({ publicId: 'arena/attacker/asset123', assetId: 'asset123' }, 'attacker')
assert.equal(mismatch.skipped, true)
assert.equal(mismatch.reason, 'asset_identity_mismatch')
assert.equal(calls.length, 1)
assert.equal(calls[0].options.method, 'GET')

// 4) Asset lookup uses Cloudinary Admin API Basic auth and safe URL construction.
calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return { status: 200, ok: true, async json() { return { asset_id: 'asset+weird' } } }
}
await getCloudinaryAssetById('asset-weird')
assert.match(String(calls[0].url), /resources\/asset-weird$/)
assert.equal(new URL(calls[0].url).searchParams.has('image_metadata'), false)
assert.match(calls[0].options.headers.authorization, /^Basic /)

// 5) Version verification explicitly requests Cloudinary's video metadata.
calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options })
  return {
    status: 200,
    ok: true,
    async json() {
      return {
        asset_id: 'asset-weird',
        public_id: 'arena/attacker/asset-weird',
        resource_type: 'video',
        type: 'upload',
        bytes: 9840497,
        format: 'mp4',
        video_duration: 30.526667,
        secure_url: 'https://res.cloudinary.com/arena-test/video/upload/arena/attacker/asset-weird.mp4',
      }
    },
  }
}
const videoAsset = await getCloudinaryAssetById('asset-weird', { includeVideoMetadata: true })
assert.equal(new URL(calls[0].url).searchParams.get('image_metadata'), 'true')
assert.equal(videoAsset.duration, 30.526667)
assert.equal(videoAsset.asset_id, 'asset-weird')

// 6) Owned namespace helper rejects path traversal and nested-path tricks.
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/../victim', 'attacker'), false)
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/asset', 'attacker'), true)

globalThis.fetch = originalFetch
console.log('V18.2 Cloudinary ownership runtime tests: PASS')
