/* global console, process */
import crypto from 'node:crypto'
import { createReviewAccessToken, verifyPassword, verifyReviewAccessToken } from './lib/reviewAccess.js'
import { createDocument, findProjectByShareToken, getProjectVideos, getVideoComments, patchDocument } from './lib/firestoreRest.js'
import { applyCommonSecurityHeaders, createCsrfToken, enforceBodySize, enforceCsrf, enforceRateLimit, enforceSameOriginMutation, getClientIp, getCookie, maxHeaderLength, setCookie, setCookies } from './lib/requestSecurity.js'
import { hasOnlyKeys, hasUnsafeControlCharacters, isPlainObject, isSafeDocumentId } from './lib/inputSecurity.js'
import { safePublicError } from './lib/publicError.js'

const PROJECT_COLLECTION = 'projects'
const MAX_TOKEN_LENGTH = 43
const MAX_COMMENT_LENGTH = 2000
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 254
const VALID_STATUSES = new Set(['approved', 'changes_requested'])
const MAX_REVIEW_BODY_BYTES = 32 * 1024
const MAX_PUBLIC_VIDEOS = 1000
const MAX_PUBLIC_COMMENTS = 1000
const REVIEW_GET_LIMIT = { limit: 120, windowMs: 60 * 1000 }
const REVIEW_AUTH_IP_LIMIT = { limit: 30, windowMs: 15 * 60 * 1000 }
const REVIEW_AUTH_TOKEN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 }
const REVIEW_MUTATION_IP_LIMIT = { limit: 60, windowMs: 60 * 1000 }
const REVIEW_MUTATION_TOKEN_LIMIT = { limit: 20, windowMs: 60 * 1000 }
const REVIEW_CSRF_COOKIE = 'arena_review_csrf'
const REVIEW_ACCESS_COOKIE = 'arena_review_access'

function json(response, status, body) {
  applyCommonSecurityHeaders(response)
  return response.status(status).json(body)
}

function normalizeToken(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_NAME_LENGTH) : ''
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) : ''
}

function validToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

function parseBody(request) {
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body || '{}') } catch { return null }
  }
  return request.body
}

function getQueryValue(request, key) {
  if (typeof request.query?.[key] === 'string') return request.query[key].slice(0, 150)
  try { return new URL(request.url || '', 'http://localhost').searchParams.get(key)?.slice(0, 150) || '' } catch { return '' }
}

function setReviewAccessCookies(request, response, accessToken, csrfToken) {
  setCookies(response, request, [
    {
      name: REVIEW_ACCESS_COOKIE,
      value: accessToken,
      attributes: ['Path=/api/review', 'HttpOnly', 'SameSite=Strict', 'Max-Age=604800'],
    },
    {
      name: REVIEW_CSRF_COOKIE,
      value: csrfToken,
      attributes: ['Path=/', 'SameSite=Strict', 'Max-Age=604800'],
    },
  ])
}

function ensureReviewCsrfCookie(request, response) {
  const existing = getCookie(request, REVIEW_CSRF_COOKIE)
  if (existing) return existing
  const token = createCsrfToken()
  setCookie(response, request, REVIEW_CSRF_COOKIE, token, ['Path=/', 'SameSite=Strict', 'Max-Age=604800'])
  return token
}

function getReviewToken(request) {
  return normalizeToken(maxHeaderLength(request, 'x-arena-review-token', 256))
}

function publicComment(comment) {
  return {
    id: comment?.id || '',
    timestamp: Number(comment?.timestamp || 0),
    text: typeof comment?.text === 'string' ? comment.text : '',
    clientName: typeof comment?.clientName === 'string' ? comment.clientName : '',
    resolved: comment?.resolved === true,
    createdAt: comment?.createdAt || null,
    ...(comment?.updatedAt ? { updatedAt: comment.updatedAt } : {}),
  }
}

function getReviewAccessToken(request) {
  return getCookie(request, REVIEW_ACCESS_COOKIE)
}

function isProtected(project) {
  return project?.reviewPasswordEnabled === true && Boolean(project.reviewPasswordHash && project.reviewPasswordSalt && project.reviewPasswordVersion)
}

function accessAllowed(request, project, shareToken) {
  if (!isProtected(project)) return true
  return verifyReviewAccessToken(
    getReviewAccessToken(request),
    project.id,
    shareToken,
    project.reviewPasswordVersion,
  )
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

async function addCommentDocument(projectId, videoId, data) {
  const documentId = crypto.randomUUID().replace(/-/g, '')
  const timestamp = Number(data.timestamp)
  const text = data.text
  const clientName = data.clientName
  const clientEmail = data.clientEmail
  const createdAt = new Date()
  await createDocument(
    `/${PROJECT_COLLECTION}/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoId)}/comments`,
    {
      timestamp,
      text,
      clientName,
      clientEmail,
      resolved: false,
      createdAt,
    },
    documentId,
  )
  return publicComment({ id: documentId, timestamp, text, clientName, resolved: false, createdAt })
}

function validatePostBody(body, action) {
  const allowed = {
    authenticate: ['action', 'password'],
    comment: ['action', 'videoId', 'timestamp', 'text', 'clientName', 'clientEmail'],
    decision: ['action', 'videoId', 'status', 'reason'],
  }
  if (!allowed[action] || !hasOnlyKeys(body, allowed[action])) {
    const error = new Error('Invalid review request.')
    error.status = 400
    error.code = 'invalid_request_body'
    throw error
  }
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Method not allowed.' })

  try {
    if (request.method === 'POST') {
      enforceBodySize(request, MAX_REVIEW_BODY_BYTES)
      enforceSameOriginMutation(request)
    }

    const shareToken = getReviewToken(request)
    if (!validToken(shareToken)) return json(response, 400, { error: 'Invalid review link.', code: 'invalid_review_link' })

    const clientIp = getClientIp(request)
    if (request.method === 'GET') {
      enforceRateLimit(response, 'review-get-ip', [clientIp], REVIEW_GET_LIMIT)
      enforceRateLimit(response, 'review-get-token', [shareToken], REVIEW_GET_LIMIT)
    } else {
      enforceRateLimit(response, 'review-post-ip', [clientIp], REVIEW_MUTATION_IP_LIMIT)
      enforceRateLimit(response, 'review-post-token', [shareToken], REVIEW_MUTATION_TOKEN_LIMIT)
    }

    const project = await findProjectByShareToken(shareToken)
    if (!project) return json(response, 404, { error: 'This review link is no longer available.', code: 'review_not_found' })
    if (project.shareActive === false) return json(response, 410, { error: 'This review link has been paused by the project owner.', code: 'review_paused' })

    if (request.method === 'POST') {
      const body = parseBody(request)
      if (!isPlainObject(body)) return json(response, 400, { error: 'Invalid review request.', code: 'invalid_request_body' })
      const action = typeof body.action === 'string' ? body.action : ''
      validatePostBody(body, action)

      if (action === 'authenticate') {
        enforceRateLimit(response, 'review-auth-ip', [clientIp], REVIEW_AUTH_IP_LIMIT)
        enforceRateLimit(response, 'review-auth-token', [shareToken], REVIEW_AUTH_TOKEN_LIMIT)
        if (!isProtected(project)) return json(response, 200, { protected: false })

        const password = typeof body.password === 'string' ? body.password : ''
        if (password.length > 128 || !verifyPassword(password, project.reviewPasswordSalt, project.reviewPasswordHash)) {
          return json(response, 401, { error: 'That review password is incorrect.', code: 'invalid_review_password' })
        }

        const accessToken = createReviewAccessToken(project.id, shareToken, project.reviewPasswordVersion)
        const csrfToken = createCsrfToken()
        setReviewAccessCookies(request, response, accessToken, csrfToken)
        return json(response, 200, { protected: true })
      }

      if (!accessAllowed(request, project, shareToken)) {
        return json(response, 401, { error: 'This review requires its password.', code: 'review_password_required', requiresPassword: true })
      }

      if (isProtected(project)) enforceCsrf(request, { headerName: 'x-arena-review-csrf', cookieName: REVIEW_CSRF_COOKIE })
      const videoId = typeof body.videoId === 'string' ? body.videoId : ''
      if (!isSafeDocumentId(videoId)) return json(response, 400, { error: 'That version could not be found.', code: 'version_not_found' })

      const videos = await getProjectVideos(project.id, { maxItems: MAX_PUBLIC_VIDEOS })
      const video = videos.find((item) => item.id === videoId)
      if (!video) return json(response, 404, { error: 'That version could not be found.', code: 'version_not_found' })

      if (action === 'comment') {
        const text = typeof body.text === 'string' ? body.text.trim() : ''
        const clientName = normalizeName(body.clientName)
        const clientEmail = normalizeEmail(body.clientEmail)
        const timestamp = Number(body.timestamp)
        if (!text || text.length > MAX_COMMENT_LENGTH || hasUnsafeControlCharacters(text)) return json(response, 400, { error: 'Feedback must be between 1 and 2000 characters.' })
        if (!clientName || hasUnsafeControlCharacters(clientName)) return json(response, 400, { error: 'Your name is required to post feedback.' })
        if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return json(response, 400, { error: 'A valid email is required to post feedback.' })
        if (!Number.isFinite(timestamp) || timestamp < 0 || (Number(video.duration || 0) > 0 && timestamp > Number(video.duration))) {
          return json(response, 400, { error: 'Feedback timestamp is outside this video.' })
        }

        const comment = await addCommentDocument(project.id, video.id, { timestamp, text, clientName, clientEmail })
        return json(response, 200, { comment })
      }

      if (action === 'decision') {
        const status = body.status
        const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : ''
        if (!VALID_STATUSES.has(status)) return json(response, 400, { error: 'Invalid review decision.' })
        if (hasUnsafeControlCharacters(reason)) return json(response, 400, { error: 'The decision note contains invalid characters.' })
        if (status === 'changes_requested' && !reason) return json(response, 400, { error: 'Add a short description of what needs to change.' })

        const now = new Date()
        await patchDocument(`/${PROJECT_COLLECTION}/${encodeURIComponent(project.id)}/videos/${encodeURIComponent(video.id)}`, {
          status,
          statusReason: reason,
          statusUpdatedAt: now,
        })

        const latestVideo = videos[videos.length - 1]
        let projectStatus = project.status || 'pending'
        let projectStatusReason = project.statusReason || ''
        let projectStatusUpdatedAt = project.statusUpdatedAt || null
        if (latestVideo?.id === video.id) {
          await patchDocument(`/${PROJECT_COLLECTION}/${encodeURIComponent(project.id)}`, {
            status,
            statusReason: reason,
            statusUpdatedAt: now,
          })
          projectStatus = status
          projectStatusReason = reason
          projectStatusUpdatedAt = now.toISOString()
        }

        return json(response, 200, {
          status,
          statusReason: reason,
          statusUpdatedAt: now.toISOString(),
          videoId: video.id,
          projectStatus,
          projectStatusReason,
          projectStatusUpdatedAt,
        })
      }

      return json(response, 400, { error: 'Unsupported review action.', code: 'invalid_request_body' })
    }

    if (isProtected(project)) {
      if (!accessAllowed(request, project, shareToken)) {
        return json(response, 401, { error: 'This review is password protected.', code: 'review_password_required', requiresPassword: true })
      }
      ensureReviewCsrfCookie(request, response)
    }

    const videoId = getQueryValue(request, 'videoId') || null
    const videos = await getProjectVideos(project.id, { maxItems: MAX_PUBLIC_VIDEOS })
    const publicProject = {
      id: project.id,
      title: project.title || 'Untitled project',
      status: project.status || 'pending',
      statusReason: project.statusReason || '',
      statusUpdatedAt: project.statusUpdatedAt || null,
      createdAt: project.createdAt || null,
    }
    const publicVideos = videos.map((video) => {
      const status = effectiveStatus(project, video, videos)
      return {
        id: video.id,
        title: video.title || 'Untitled version',
        videoUrl: video.videoUrl || '',
        duration: Number(video.duration || 0),
        createdAt: video.createdAt || null,
        status,
        statusReason: video.statusReason || (status === project.status ? project.statusReason || '' : ''),
      }
    })
    const comments = videoId && isSafeDocumentId(videoId) && publicVideos.some((video) => video.id === videoId)
      ? (await getVideoComments(project.id, videoId, { maxItems: MAX_PUBLIC_COMMENTS })).map(publicComment)
      : []

    return json(response, 200, {
      project: publicProject,
      videos: publicVideos,
      comments,
      security: { passwordProtected: isProtected(project) },
      limits: { maxVideos: MAX_PUBLIC_VIDEOS, maxComments: MAX_PUBLIC_COMMENTS },
    })
  } catch (error) {
    console.error('Arena review API error:', { status: error?.status || 500, code: error?.code || 'internal_error' })
    const result = safePublicError(error, 'Could not process this review.')
    return json(response, result.status, result.body)
  }
}
