/* global console, process */
import crypto from 'node:crypto'
import { requireFirebaseUser } from './lib/auth.js'
import { createDocument, deleteDocument, getDocument, getProjectVideos, getVideoComments, patchDocument } from './lib/firestoreRest.js'
import { destroyVideoAsset, getCloudinaryAssetById, isOwnedCloudinaryPublicId, publicIdFromVideo } from './lib/cloudinary.js'
import { hashPassword, validateReviewPassword } from './lib/reviewAccess.js'
import { applyCommonSecurityHeaders, enforceBodySize, enforceRateLimit, enforceSameOriginMutation, getClientIp } from './lib/requestSecurity.js'
import { hasOnlyKeys, hasUnsafeControlCharacters, isPlainObject, isSafeCloudinaryAssetId, isSafeDocumentId } from './lib/inputSecurity.js'
import { safePublicError } from './lib/publicError.js'

const PROJECT_COLLECTION = 'projects'
const MAX_TITLE_LENGTH = 200
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
const ALLOWED_VIDEO_FORMATS = new Set(['mp4', 'mov', 'avi'])

function json(response, status, body) {
  applyCommonSecurityHeaders(response)
  return response.status(status).json(body)
}

function fail(message, status = 400, code = '', expose = true) {
  const error = Object.assign(new Error(message), { status, expose })
  if (code) error.code = code
  throw error
}

function normalizeTitle(value, message) {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title || title.length > MAX_TITLE_LENGTH || hasUnsafeControlCharacters(title)) fail(message)
  return title
}

function normalizeRequestId(value) {
  if (value === undefined) return crypto.randomUUID().replace(/-/g, '')
  if (!isSafeDocumentId(value, 150)) fail('Invalid request identifier.', 400, 'invalid_request_body')
  return value
}

function normalizeProjectId(value) {
  if (!isSafeDocumentId(value)) fail('Project not found.', 404, 'project_not_found')
  return value
}

function normalizeVideoId(value) {
  if (!isSafeDocumentId(value)) fail('A version is required.', 400)
  return value
}

function projectPath(projectId) {
  return `/${PROJECT_COLLECTION}/${encodeURIComponent(projectId)}`
}

function videoPath(projectId, videoId) {
  return `${projectPath(projectId)}/videos/${encodeURIComponent(videoId)}`
}

async function requireOwnedProject(projectId, userId) {
  const safeProjectId = normalizeProjectId(projectId)
  const project = await getDocument(projectPath(safeProjectId))
  if (!project || project.userId !== userId) fail('Project not found.', 404, 'project_not_found')
  return project
}

async function deleteComments(projectId, videoId) {
  const comments = await getVideoComments(projectId, videoId, { maxItems: 1000 })
  for (const comment of comments) {
    if (!isSafeDocumentId(comment?.id)) continue
    await deleteDocument(`${videoPath(projectId, videoId)}/comments/${encodeURIComponent(comment.id)}`)
  }
}

function effectiveStatus(project, video, videos) {
  if (video?.status && video.status !== 'pending') return video.status
  const projectStatus = project?.status || 'pending'
  if (projectStatus === 'pending') return 'pending'
  const updatedAt = project?.statusUpdatedAt ? new Date(project.statusUpdatedAt).getTime() : 0
  if (!updatedAt) return 'pending'
  const candidates = videos
    .filter((item) => item.createdAt)
    .filter((item) => new Date(item.createdAt).getTime() <= updatedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return candidates[0]?.id === video?.id ? projectStatus : 'pending'
}

function validateCloudinaryVideoUrl(videoUrl, publicId) {
  let parsed
  try {
    parsed = new URL(videoUrl)
  } catch {
    fail('The uploaded video URL is invalid.')
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const expectedPrefix = cloudName ? `/${cloudName}/video/upload/` : ''
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || parsed.port || !expectedPrefix || !parsed.pathname.startsWith(expectedPrefix)) {
    fail('The uploaded video URL could not be verified.')
  }

  const urlPublicId = publicIdFromVideo({ videoUrl })
  if (!urlPublicId || urlPublicId !== publicId) fail('The uploaded video reference could not be verified.')
}

async function assertVersionInput(body, user) {
  const title = normalizeTitle(body.title, 'Enter a version title up to 200 characters.')
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''
  const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : ''
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''

  if (!videoUrl || videoUrl.length > 2048 || hasUnsafeControlCharacters(videoUrl)) fail('The uploaded video URL is invalid.')
  if (!publicId || publicId.length > 512 || hasUnsafeControlCharacters(publicId)) fail('The uploaded video reference is invalid.')
  if (!isSafeCloudinaryAssetId(assetId)) fail('The uploaded asset reference is invalid.')
  if (!isOwnedCloudinaryPublicId(publicId, user.uid)) fail('The uploaded asset does not belong to this account.', 403)

  validateCloudinaryVideoUrl(videoUrl, publicId)

  const asset = await getCloudinaryAssetById(assetId, { includeVideoMetadata: true })
  const assetFormat = typeof asset?.format === 'string' ? asset.format.toLowerCase() : ''
  const assetBytes = Number(asset?.bytes)
  const assetDuration = Number(asset?.duration)
  if (!asset
    || asset.asset_id !== assetId
    || asset.public_id !== publicId
    || asset.resource_type !== 'video'
    || asset.type !== 'upload'
    || !isOwnedCloudinaryPublicId(asset.public_id, user.uid)
    || !Number.isInteger(assetBytes)
    || assetBytes <= 0
    || assetBytes > MAX_UPLOAD_BYTES
    || !ALLOWED_VIDEO_FORMATS.has(assetFormat)
    || !Number.isFinite(assetDuration)
    || assetDuration < 0
    || assetDuration > 86400
    || typeof asset.secure_url !== 'string'
    || asset.secure_url !== videoUrl) {
    fail('The uploaded video asset could not be verified.', 400, 'cloudinary_asset_mismatch')
  }

  return {
    title,
    videoUrl,
    publicId,
    assetId,
    duration: assetDuration,
  }
}

function sameVersionData(existing, expected) {
  return Boolean(existing
    && existing.status === 'pending'
    && existing.title === expected.title
    && existing.videoUrl === expected.videoUrl
    && existing.publicId === expected.publicId
    && existing.assetId === expected.assetId)
}

async function createProject(userId, body) {
  const title = normalizeTitle(body.title, 'Enter a project name up to 200 characters.')
  const requestId = normalizeRequestId(body.requestId)
  const existing = await getDocument(projectPath(requestId))
  if (existing) {
    if (existing.userId !== userId || typeof existing.shareToken !== 'string' || existing.title !== title) {
      fail('That request identifier is already in use.', 409, 'request_conflict')
    }
    return { projectId: requestId, shareToken: existing.shareToken, title: existing.title, replayed: true }
  }

  const shareToken = crypto.randomBytes(32).toString('base64url')
  const fields = {
    userId,
    title,
    shareToken,
    createdAt: new Date(),
    status: 'pending',
    shareActive: true,
    reviewPasswordEnabled: false,
    reviewPasswordSalt: '',
    reviewPasswordHash: '',
    reviewPasswordVersion: '',
  }

  try {
    await createDocument(`/${PROJECT_COLLECTION}`, fields, requestId)
  } catch (error) {
    if (error?.status === 409) {
      const replay = await getDocument(projectPath(requestId))
      if (replay?.userId === userId && replay?.title === title && typeof replay.shareToken === 'string') {
        return { projectId: requestId, shareToken: replay.shareToken, title: replay.title, replayed: true }
      }
      fail('That request identifier is already in use.', 409, 'request_conflict')
    }
    throw error
  }

  return { projectId: requestId, shareToken, title, replayed: false }
}

async function createVersion(projectId, userId, body) {
  const project = await requireOwnedProject(projectId, userId)
  const requestId = normalizeRequestId(body.requestId)
  const version = await assertVersionInput(body, { uid: userId })
  const expectedPath = videoPath(projectId, requestId)
  const existing = await getDocument(expectedPath)
  if (existing) {
    if (sameVersionData(existing, version)) {
      await patchDocument(projectPath(projectId), {
        status: 'pending',
        statusReason: '',
        statusUpdatedAt: new Date(),
      })
      return {
        projectId,
        videoId: requestId,
        title: existing.title,
        status: existing.status,
        duration: Number(existing.duration || 0),
        previousStatus: project?.status || 'pending',
        replayed: true,
      }
    }
    fail('That request identifier is already in use.', 409, 'request_conflict')
  }

  const now = new Date()
  const fields = {
    title: version.title,
    videoUrl: version.videoUrl,
    publicId: version.publicId,
    assetId: version.assetId,
    duration: version.duration,
    createdAt: now,
    status: 'pending',
    statusReason: '',
  }

  try {
    await createDocument(`${projectPath(projectId)}/videos`, fields, requestId)
  } catch (error) {
    if (error?.status === 409) {
      const replay = await getDocument(expectedPath)
      if (sameVersionData(replay, version)) {
        return {
          projectId,
          videoId: requestId,
          title: replay.title,
          status: replay.status,
          duration: Number(replay.duration || 0),
          previousStatus: project?.status || 'pending',
          replayed: true,
        }
      }
      fail('That request identifier is already in use.', 409, 'request_conflict')
    }
    if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
      try { await destroyVideoAsset(fields, userId) } catch (cleanupError) { console.error('Rejected upload cleanup failed:', { code: cleanupError?.code || 'cleanup_failed' }) }
    }
    throw error
  }

  await patchDocument(projectPath(projectId), {
    status: 'pending',
    statusReason: '',
    statusUpdatedAt: now,
  })

  return {
    projectId,
    videoId: requestId,
    title: version.title,
    status: 'pending',
    duration: version.duration,
    previousStatus: project?.status || 'pending',
    replayed: false,
  }
}

async function removeVersion(projectId, project, videoId, userId) {
  const videos = await getProjectVideos(projectId)
  const video = videos.find((item) => item.id === videoId)
  if (!video) fail('That version could not be found.', 404, 'version_not_found')

  await destroyVideoAsset(video, userId)
  await deleteComments(projectId, video.id)
  await deleteDocument(videoPath(projectId, video.id))

  const remaining = videos.filter((item) => item.id !== video.id)
  const latest = remaining[remaining.length - 1]
  const status = latest ? effectiveStatus(project, latest, remaining) : 'pending'
  const statusReason = latest ? (latest.statusReason || (status === project.status ? project.statusReason || '' : '')) : ''
  await patchDocument(projectPath(projectId), {
    status,
    statusReason,
    statusUpdatedAt: new Date(),
  })
  return { deletedVideoId: video.id, status, statusReason }
}

async function removeProject(projectId, project, userId) {
  const videos = await getProjectVideos(projectId)
  for (const video of videos) await destroyVideoAsset(video, userId)
  for (const video of videos) await deleteComments(projectId, video.id)
  for (const video of videos) await deleteDocument(videoPath(projectId, video.id))
  await deleteDocument(projectPath(projectId))
  return { deletedProjectId: projectId, deletedVersions: videos.length }
}

function validateActionBody(body, action) {
  const allowedKeys = {
    createProject: ['action', 'title', 'requestId'],
    createVersion: ['action', 'projectId', 'requestId', 'title', 'videoUrl', 'publicId', 'assetId', 'duration'],
    deleteVersion: ['action', 'projectId', 'videoId'],
    deleteProject: ['action', 'projectId'],
    setShareActive: ['action', 'projectId', 'active'],
    setReviewPassword: ['action', 'projectId', 'password'],
    clearReviewPassword: ['action', 'projectId'],
    cleanupUpload: ['action', 'publicId', 'assetId'],
  }
  if (!allowedKeys[action] || !hasOnlyKeys(body, allowedKeys[action])) fail('Invalid project request.', 400, 'invalid_request_body')
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' })

  try {
    enforceBodySize(request, 32 * 1024)
    enforceSameOriginMutation(request)
    const user = await requireFirebaseUser(request)
    enforceRateLimit(response, 'project-generic-uid', [user.uid], { limit: 120, windowMs: 60 * 1000 })
    enforceRateLimit(response, 'project-generic-ip', [getClientIp(request)], { limit: 240, windowMs: 60 * 1000 })

    let body
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body
    } catch {
      return json(response, 400, { error: 'Invalid project request.', code: 'invalid_request_body' })
    }
    if (!isPlainObject(body)) return json(response, 400, { error: 'Invalid project request.', code: 'invalid_request_body' })

    const action = typeof body.action === 'string' ? body.action : ''
    validateActionBody(body, action)

    const ip = getClientIp(request)
    const actionLimits = {
      createProject: { limit: 10, windowMs: 10 * 60 * 1000 },
      createVersion: { limit: 10, windowMs: 60 * 1000 },
      deleteVersion: { limit: 10, windowMs: 10 * 60 * 1000 },
      deleteProject: { limit: 5, windowMs: 30 * 60 * 1000 },
      setShareActive: { limit: 30, windowMs: 10 * 60 * 1000 },
      setReviewPassword: { limit: 10, windowMs: 15 * 60 * 1000 },
      clearReviewPassword: { limit: 10, windowMs: 15 * 60 * 1000 },
      cleanupUpload: { limit: 20, windowMs: 10 * 60 * 1000 },
    }
    if (actionLimits[action]) {
      enforceRateLimit(response, `project-${action}-uid`, [user.uid], actionLimits[action])
      enforceRateLimit(response, `project-${action}-ip`, [ip], actionLimits[action])
    }

    if (action === 'createProject') {
      return json(response, 200, await createProject(user.uid, body))
    }

    if (action === 'cleanupUpload') {
      const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : ''
      const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''
      if (!isSafeCloudinaryAssetId(assetId) || !isOwnedCloudinaryPublicId(publicId, user.uid)) {
        return json(response, 400, { error: 'The uploaded asset could not be verified.', code: 'cloudinary_asset_mismatch' })
      }
      const result = await destroyVideoAsset({ publicId, assetId, resource_type: 'video' }, user.uid)
      return json(response, 200, { cleaned: result.skipped !== true })
    }

    const projectId = normalizeProjectId(body.projectId)
    const project = await requireOwnedProject(projectId, user.uid)

    if (action === 'createVersion') {
      return json(response, 200, await createVersion(projectId, user.uid, body))
    }

    if (action === 'deleteVersion') {
      return json(response, 200, await removeVersion(projectId, project, normalizeVideoId(body.videoId), user.uid))
    }

    if (action === 'deleteProject') {
      return json(response, 200, await removeProject(projectId, project, user.uid))
    }

    if (action === 'setShareActive') {
      if (typeof body.active !== 'boolean') return json(response, 400, { error: 'Invalid share setting.', code: 'invalid_request_body' })
      await patchDocument(projectPath(projectId), { shareActive: body.active })
      return json(response, 200, { shareActive: body.active })
    }

    if (action === 'setReviewPassword') {
      const password = typeof body.password === 'string' ? body.password : ''
      const validation = validateReviewPassword(password)
      if (validation) return json(response, 400, { error: validation })
      const { salt, hash } = hashPassword(password)
      const version = crypto.randomUUID()
      await patchDocument(projectPath(projectId), {
        reviewPasswordEnabled: true,
        reviewPasswordSalt: salt,
        reviewPasswordHash: hash,
        reviewPasswordVersion: version,
      })
      return json(response, 200, { reviewPasswordEnabled: true, reviewPasswordVersion: version })
    }

    if (action === 'clearReviewPassword') {
      const version = crypto.randomUUID()
      await patchDocument(projectPath(projectId), {
        reviewPasswordEnabled: false,
        reviewPasswordSalt: '',
        reviewPasswordHash: '',
        reviewPasswordVersion: version,
      })
      return json(response, 200, { reviewPasswordEnabled: false, reviewPasswordVersion: version })
    }

    return json(response, 400, { error: 'Unsupported project action.', code: 'invalid_request_body' })
  } catch (error) {
    console.error('Arena project API error:', { status: error?.status || 500, code: error?.code || 'internal_error' })
    const result = safePublicError(error, 'Could not update this project.')
    return json(response, result.status, result.body)
  }
}
