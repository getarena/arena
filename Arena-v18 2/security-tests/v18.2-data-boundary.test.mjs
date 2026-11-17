import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getCloudinaryAssetById, isOwnedCloudinaryPublicId, publicIdFromVideo } from '../api/lib/cloudinary.js'

assert.equal(typeof getCloudinaryAssetById, 'function')

const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')

// Firestore rule contract: dangerous client-side lifecycle writes are denied.
assert.match(rules, /allow delete:\s*if false;/)
assert.match(rules, /allow create, update, delete:\s*if false;/)
assert.match(rules, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['title'\]\)/)
assert.match(rules, /allow create: if false;/)
assert.doesNotMatch(fs.readFileSync(new URL('../api/project.js', import.meta.url), 'utf8'), /body\.shareToken/)
assert.ok(rules.includes("allow create, update, delete: if false;"))
assert.match(rules, /request\.resource\.data\.keys\(\)\.hasOnly\(\[/)
assert.match(fs.readFileSync(new URL('../api/project.js', import.meta.url), 'utf8'), /action === 'createVersion'/)
assert.match(fs.readFileSync(new URL('../api/project.js', import.meta.url), 'utf8'), /isOwnedCloudinaryPublicId\(publicId, user\.uid\)/)
const projectJs = fs.readFileSync(new URL('../api/project.js', import.meta.url), 'utf8')
assert.match(projectJs, /publicIdFromVideo\(\{ videoUrl \}\)/)
assert.match(projectJs, /getCloudinaryAssetById\(assetId, \{ includeVideoMetadata: true \}\)/)
assert.match(projectJs, /asset\.public_id !== publicId/)
const cloudinaryJs = fs.readFileSync(new URL('../api/lib/cloudinary.js', import.meta.url), 'utf8')
assert.match(cloudinaryJs, /getCloudinaryAssetById\(assetId\)/)
assert.match(cloudinaryJs, /searchParams\.set\('image_metadata', 'true'\)/)
assert.match(cloudinaryJs, /data\.video_duration \?\? data\.duration \?\? data\.audio_duration/)
assert.match(cloudinaryJs, /asset\.asset_id !== assetId/)
assert.match(cloudinaryJs, /asset\.public_id !== publicId/)
const accountDeleteJs = fs.readFileSync(new URL('../api/account-delete.js', import.meta.url), 'utf8')
assert.match(accountDeleteJs, /destroyVideoAsset\(video, userId\)/)
assert.match(accountDeleteJs, /deleteProjectData\(project, user\.uid\)/)
const firestoreJs = fs.readFileSync(new URL('../src/lib/firestore.js', import.meta.url), 'utf8')
assert.ok(!firestoreJs.includes("addDoc(collection(db, 'projects', projectId, 'videos')"), 'browser Firestore video creation must stay disabled')
assert.ok(!firestoreJs.includes("deleteDoc(doc(db, 'projects', projectId, 'videos')"), 'browser Firestore video deletion must stay disabled')
assert.ok(!firestoreJs.includes("updateDoc(doc(db, 'projects', projectId, 'videos')"), 'browser Firestore video metadata updates must stay disabled')
assert.match(firestoreJs, /deleteProjectApi\(projectId\)/)
assert.match(firestoreJs, /deleteVersionApi\(projectId, videoId\)/)

// Cloudinary binding: only the authenticated owner's Arena folder can be deleted.
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/asset_123', 'attacker'), true)
assert.equal(isOwnedCloudinaryPublicId('arena/victim/asset_123', 'attacker'), false)
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/victim/asset_123', 'attacker'), false)
assert.equal(isOwnedCloudinaryPublicId('https://example.com/asset', 'attacker'), false)
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/asset_123', ''), false)
assert.equal(isOwnedCloudinaryPublicId('arena/attacker/asset_123/', 'attacker'), false)

// URL fallback is still supported for legacy records, but the later ownership check
// must reject an asset outside the authenticated owner's namespace.
assert.equal(publicIdFromVideo({ publicId: 'arena/attacker/asset_123' }), 'arena/attacker/asset_123')
assert.equal(
  publicIdFromVideo({ videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/arena/attacker/asset_123.mp4' }),
  'arena/attacker/asset_123',
)

console.log('V18.2 data-boundary security contract: PASS')
