/* global process */
import crypto from 'node:crypto'
import { DEFAULT_UPSTREAM_TIMEOUT_MS } from './requestSecurity.js'
import { isSafeCloudinaryAssetId } from './inputSecurity.js'

const MAX_PUBLIC_ID_LENGTH = 512

function signParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex')
}

function sanitizeUid(uid) {
  return String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '')
}

function expectedOwnerPrefix(ownerUid) {
  const safeUid = sanitizeUid(ownerUid)
  return safeUid ? `arena/${safeUid}/` : ''
}

export function isOwnedCloudinaryPublicId(publicId, ownerUid) {
  if (typeof publicId !== 'string' || !publicId || publicId.length > MAX_PUBLIC_ID_LENGTH) return false
  const prefix = expectedOwnerPrefix(ownerUid)
  if (!prefix || !publicId.startsWith(prefix)) return false
  const remainder = publicId.slice(prefix.length)
  return /^[A-Za-z0-9_-]+$/.test(remainder)
}

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary server credentials are not configured.')
  return { cloudName, apiKey, apiSecret }
}

export async function getCloudinaryAssetById(assetId, options = {}) {
  if (!isSafeCloudinaryAssetId(assetId)) return null

  const { cloudName, apiKey, apiSecret } = getConfig()
  const includeVideoMetadata = options?.includeVideoMetadata === true
  const lookupUrl = new URL(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/${encodeURIComponent(assetId.trim())}`,
  )

  // Cloudinary's asset-ID endpoint uses image_metadata=true to return
  // video_duration/audio_duration for video resources. Do not request this
  // additional metadata for deletion lookups, which only need asset identity.
  if (includeVideoMetadata) lookupUrl.searchParams.set('image_metadata', 'true')

  const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const response = await fetch(lookupUrl.toString(), {
    method: 'GET',
    headers: { authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(DEFAULT_UPSTREAM_TIMEOUT_MS),
  })

  if (response.status === 404) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('Cloudinary asset lookup error:', { status: response.status })
    throw new Error('Could not verify the uploaded video asset.')
  }

  if (!includeVideoMetadata || !data || typeof data !== 'object' || Array.isArray(data)) return data

  // The Admin API returns video_duration (and, for audio-only uploads,
  // audio_duration) rather than the Upload API's duration property.
  const durationValue = data.video_duration ?? data.duration ?? data.audio_duration
  if (durationValue === undefined || durationValue === null || durationValue === '') return data

  const duration = Number(durationValue)
  return Number.isFinite(duration) ? { ...data, duration } : data
}

export function publicIdFromVideo(video) {
  if (typeof video?.publicId === 'string' && video.publicId.trim()) return video.publicId.trim()
  const url = typeof video?.videoUrl === 'string' ? video.videoUrl : ''
  const marker = '/upload/'
  const uploadIndex = url.indexOf(marker)
  if (uploadIndex < 0) return ''

  let path = url.slice(uploadIndex + marker.length)
  path = path.split('?')[0].split('#')[0]
  const parts = path.split('/').filter(Boolean)
  while (parts.length && (/^v\d+$/.test(parts[0]) || /[,=]/.test(parts[0]))) parts.shift()
  if (!parts.length) return ''
  const last = parts.pop()
  parts.push(last.replace(/\.[^.]+$/, ''))
  const publicId = parts.join('/')
  return publicId.length <= MAX_PUBLIC_ID_LENGTH ? publicId : ''
}

export async function destroyVideoAsset(video, ownerUid) {
  const publicId = publicIdFromVideo(video)
  if (!publicId) return { skipped: true, publicId: '', reason: 'missing_public_id' }

  if (!isOwnedCloudinaryPublicId(publicId, ownerUid)) {
    console.warn('Skipped Cloudinary deletion for an untrusted asset reference.')
    return { skipped: true, publicId: '', reason: 'untrusted_asset_reference' }
  }

  const { cloudName, apiKey, apiSecret } = getConfig()
  const assetId = typeof video?.assetId === 'string' ? video.assetId.trim() : ''
  let verifiedAssetId = ''

  if (assetId) {
    const asset = await getCloudinaryAssetById(assetId)
    if (!asset) return { skipped: true, publicId: '', reason: 'asset_not_found' }
    if (asset.asset_id !== assetId || asset.public_id !== publicId || asset.resource_type !== 'video' || !isOwnedCloudinaryPublicId(asset.public_id, ownerUid)) {
      console.warn('Skipped Cloudinary deletion for a mismatched asset reference.')
      return { skipped: true, publicId: '', reason: 'asset_identity_mismatch' }
    }
    verifiedAssetId = assetId
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const params = verifiedAssetId
    ? { asset_id: verifiedAssetId, invalidate: true, timestamp }
    : { invalidate: true, public_id: publicId, timestamp }
  const signature = signParams(params, apiSecret)
  const form = new URLSearchParams({
    api_key: apiKey,
    timestamp: String(timestamp),
    invalidate: 'true',
    signature,
  })
  if (verifiedAssetId) form.set('asset_id', verifiedAssetId)
  else form.set('public_id', publicId)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(DEFAULT_UPSTREAM_TIMEOUT_MS),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !['ok', 'not found'].includes(String(data?.result || '').toLowerCase())) {
    console.error('Cloudinary delete error:', { status: response.status, result: data?.result || 'unknown' })
    throw new Error('Could not remove the uploaded video from Cloudinary.')
  }

  return { skipped: false, publicId, assetId: verifiedAssetId || assetId, result: data.result }
}
