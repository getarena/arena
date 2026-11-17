/* global process */
import crypto from 'node:crypto'
import { requireFirebaseUser } from './lib/auth.js'
import { applyCommonSecurityHeaders, enforceBodySize, enforceRateLimit, enforceSameOriginMutation, getClientIp } from './lib/requestSecurity.js'
import { hasOnlyKeys, hasUnsafeControlCharacters, isPlainObject } from './lib/inputSecurity.js'
import { safePublicError } from './lib/publicError.js'

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
const ALLOWED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi'])
const ALLOWED_VIDEO_FORMATS = 'mp4,mov,avi'

function json(response, status, body) {
  applyCommonSecurityHeaders(response)
  return response.status(status).json(body)
}

function signParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex')
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' })

  try {
    enforceBodySize(request, 8 * 1024)
    enforceSameOriginMutation(request)
    const user = await requireFirebaseUser(request)
    enforceRateLimit(response, 'upload-signature-user', [user.uid], { limit: 10, windowMs: 60 * 1000 })
    enforceRateLimit(response, 'upload-signature-ip', [getClientIp(request)], { limit: 20, windowMs: 60 * 1000 })

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) return json(response, 500, { error: 'Cloudinary server credentials are not configured.' })

    let body
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body
    } catch {
      return json(response, 400, { error: 'Invalid upload request.', code: 'invalid_request_body' })
    }
    if (!isPlainObject(body) || !hasOnlyKeys(body, ['fileName', 'fileSize'])) return json(response, 400, { error: 'Invalid upload request.', code: 'invalid_request_body' })

    const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 255) : ''
    const fileSize = Number(body.fileSize)
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    if (!fileName || hasUnsafeControlCharacters(fileName) || /[\\/]/.test(fileName)) return json(response, 400, { error: 'The selected file name is invalid.' })
    if (!ALLOWED_VIDEO_EXTENSIONS.has(extension)) return json(response, 400, { error: 'Please choose an MP4, MOV, or AVI video.' })
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) return json(response, 400, { error: 'File too large. The maximum is 100MB.' })

    const timestamp = Math.floor(Date.now() / 1000)
    const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeUid) return json(response, 400, { error: 'Your account cannot be used for uploads yet.' })
    const publicId = crypto.randomUUID()
    const folder = `arena/${safeUid}`
    const paramsToSign = {
      allowed_formats: ALLOWED_VIDEO_FORMATS,
      folder,
      overwrite: false,
      public_id: publicId,
      timestamp,
    }
    const signature = signParams(paramsToSign, apiSecret)

    return json(response, 200, {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      allowedFormats: ALLOWED_VIDEO_FORMATS,
      overwrite: false,
      maxBytes: MAX_UPLOAD_BYTES,
    })
  } catch (error) {
    console.error('Cloudinary upload signature error:', { status: error?.status || 500, code: error?.code || 'internal_error' })
    const result = safePublicError(error, 'Could not authorize upload.')
    return json(response, result.status, result.body)
  }
}
