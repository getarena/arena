import { auth } from './firebase'

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi']
const CLOUDINARY_HOST = 'res.cloudinary.com'

export function validateVideoFile(file) {
  if (!file) throw new Error('No video selected.')

  const extension = file.name?.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
    throw new Error('Please choose an MP4, MOV, or AVI video.')
  }

  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File too large. The maximum is 100MB.')
  }
}

function assertSignedUploadResponse(data) {
  const cloudName = typeof data?.cloudName === 'string' ? data.cloudName.trim() : ''
  const apiKey = typeof data?.apiKey === 'string' ? data.apiKey.trim() : ''
  const folder = typeof data?.folder === 'string' ? data.folder.trim() : ''
  const publicId = typeof data?.publicId === 'string' ? data.publicId.trim() : ''
  const timestamp = Number(data?.timestamp)
  if (!cloudName || !apiKey || !folder || !publicId || !Number.isInteger(timestamp) || timestamp <= 0) {
    throw new Error('The secure upload authorization could not be verified. Please try again.')
  }
  if (data?.allowedFormats !== 'mp4,mov,avi' || data?.overwrite !== false) {
    throw new Error('The secure upload policy could not be verified. Please try again.')
  }
  return { ...data, cloudName, apiKey, folder, publicId, timestamp }
}

async function getUploadSignature(file) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Please sign in again before uploading.')

  const idToken = await currentUser.getIdToken()
  const response = await fetch('/api/cloudinary-upload-signature', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.code === 'rate_limited'
      ? 'Too many upload requests. Please wait and try again.'
      : data?.code === 'request_too_large'
        ? 'That upload request is too large.'
        : 'Could not authorize the upload.'
    const error = new Error(message)
    error.status = response.status
    error.code = typeof data?.code === 'string' ? data.code : undefined
    throw error
  }
  return assertSignedUploadResponse(data)
}

function verifyUploadResponse(data, signed) {
  const expectedPublicId = `${signed.folder}/${signed.publicId}`
  const returnedPublicId = typeof data?.public_id === 'string' ? data.public_id : ''
  const returnedAssetId = typeof data?.asset_id === 'string' ? data.asset_id : ''
  const format = typeof data?.format === 'string' ? data.format.toLowerCase() : ''
  const bytes = Number(data?.bytes)
  const duration = Number(data?.duration)

  let parsedUrl = null
  try { parsedUrl = new URL(String(data?.secure_url || '')) } catch { /* invalid URL handled below */ }

  if (!parsedUrl
    || parsedUrl.protocol !== 'https:'
    || parsedUrl.hostname !== CLOUDINARY_HOST
    || parsedUrl.port
    || !data?.resource_type
    || data.resource_type !== 'video'
    || data.type !== 'upload'
    || returnedPublicId !== expectedPublicId
    || !returnedAssetId
    || returnedAssetId.length > 128
    || !/^[A-Za-z0-9_-]+$/.test(returnedAssetId)
    || !Number.isInteger(bytes)
    || bytes <= 0
    || bytes > MAX_UPLOAD_BYTES
    || !ALLOWED_VIDEO_EXTENSIONS.includes(format)
    || !Number.isFinite(duration)
    || duration < 0
    || duration > 86400) {
    throw new Error('The upload response could not be verified. Please try again.')
  }

  const videoUrl = parsedUrl.href
  return {
    // Keep `url` for compatibility with any existing caller, and also expose
    // the canonical field consumed by addVideoToProject in firestore.js.
    url: videoUrl,
    videoUrl,
    duration,
    publicId: returnedPublicId,
    assetId: returnedAssetId,
  }
}

export const uploadToCloudinary = async (file, onProgress = () => {}) => {
  validateVideoFile(file)
  const signed = await getUploadSignature(file)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signed.apiKey)
  formData.append('timestamp', String(signed.timestamp))
  formData.append('folder', signed.folder)
  formData.append('public_id', signed.publicId)
  formData.append('allowed_formats', signed.allowedFormats)
  formData.append('overwrite', String(signed.overwrite))
  formData.append('signature', signed.signature)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/video/upload`)
    xhr.responseType = 'json'

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
    })

    xhr.addEventListener('load', () => {
      const data = xhr.response || (() => {
        try { return JSON.parse(xhr.responseText || '{}') } catch { return {} }
      })()

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhr.status === 413 ? 'The upload is too large.' : xhr.status === 429 ? 'Too many upload requests. Please wait and try again.' : 'Upload failed.'))
        return
      }

      try {
        const result = verifyUploadResponse(data, signed)
        onProgress(100)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error while uploading the video.')))
    xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')))
    xhr.send(formData)
  })
}
