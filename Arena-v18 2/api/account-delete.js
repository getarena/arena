/* global console, process */
import { requireFirebaseUser } from './lib/auth.js'
import { deleteDocument, getProjectVideos, getVideoComments, queryDocuments } from './lib/firestoreRest.js'
import { destroyVideoAsset } from './lib/cloudinary.js'
import { applyCommonSecurityHeaders, enforceBodySize, enforceRateLimit, enforceSameOriginMutation, getClientIp } from './lib/requestSecurity.js'
import { hasOnlyKeys, isPlainObject } from './lib/inputSecurity.js'
import { safePublicError } from './lib/publicError.js'

const PROJECT_COLLECTION = 'projects'

function json(response, status, body) {
  applyCommonSecurityHeaders(response)
  return response.status(status).json(body)
}

async function deleteComments(projectId, videoId) {
  const comments = await getVideoComments(projectId, videoId)
  for (const comment of comments) {
    await deleteDocument(`/${PROJECT_COLLECTION}/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoId)}/comments/${encodeURIComponent(comment.id)}`)
  }
}

async function deleteProjectData(project, userId) {
  const videos = await getProjectVideos(project.id)
  for (const video of videos) await destroyVideoAsset(video, userId)
  for (const video of videos) await deleteComments(project.id, video.id)
  for (const video of videos) await deleteDocument(`/${PROJECT_COLLECTION}/${encodeURIComponent(project.id)}/videos/${encodeURIComponent(video.id)}`)
  await deleteDocument(`/${PROJECT_COLLECTION}/${encodeURIComponent(project.id)}`)
  return videos.length
}

async function deleteAuthUser(idToken) {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
  if (!apiKey) throw new Error('Firebase API key is not configured on the server.')

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  if (!response.ok) {
    await response.text().catch(() => '')
    console.error('Firebase account deletion error:', { status: response.status })
    const error = new Error('Could not delete the Firebase account.')
    error.status = response.status
    throw error
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' })

  try {
    enforceBodySize(request, 8 * 1024)
    enforceSameOriginMutation(request)
    const ip = getClientIp(request)
    enforceRateLimit(response, 'account-delete-uid', [ip], { limit: 10, windowMs: 60 * 60 * 1000 })
    const user = await requireFirebaseUser(request, { requireRecentAuth: true, maxAuthAgeSeconds: 5 * 60 })
    enforceRateLimit(response, 'account-delete-authenticated-uid', [user.uid], { limit: 3, windowMs: 60 * 60 * 1000 })
    let body
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {})
    } catch {
      return json(response, 400, { error: 'Invalid account deletion request.' })
    }
    if (!isPlainObject(body) || !hasOnlyKeys(body, ['confirmation']) || body.confirmation !== 'DELETE MY ACCOUNT') {
      return json(response, 400, { error: 'Type DELETE MY ACCOUNT to confirm account deletion.', code: 'invalid_request_body' })
    }

    const projects = await queryDocuments('projects', 'userId', user.uid)
    let deletedVersions = 0
    for (const project of projects) deletedVersions += await deleteProjectData(project, user.uid)

    try {
      await deleteAuthUser(user.idToken)
    } catch (error) {
      console.error('Arena account auth deletion did not complete after data cleanup:', { status: error?.status || 502, code: error?.code || 'auth_delete_failed' })
      return json(response, 502, {
        error: 'Arena removed your projects and uploaded videos, but could not finish deleting the sign-in account. Please sign in again and retry account deletion.',
        dataCleanupCompleted: true,
        deletedProjects: projects.length,
        deletedVersions,
      })
    }

    return json(response, 200, { deletedProjects: projects.length, deletedVersions })
  } catch (error) {
    console.error('Arena account deletion API error:', { status: error?.status || 500, code: error?.code || 'internal_error' })
    const result = safePublicError(error, 'Could not delete your Arena account.')
    return json(response, result.status, result.body)
  }
}
