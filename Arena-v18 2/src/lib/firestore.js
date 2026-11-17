import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { createProject as createProjectApi, createVersion, deleteProject as deleteProjectApi, deleteVersion as deleteVersionApi } from './projectApi'

// ─── Projects ───────────────────────────────────────────────

export const createProject = async (_userId, data) => {
  const result = await createProjectApi(data.title, data.requestId)
  return result
}

export const getUserProjects = async (userId) => {
  const q = query(collection(db, 'projects'), where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getProject = async (projectId) => {
  const docRef = doc(db, 'projects', projectId)
  const snapshot = await getDoc(docRef)
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export const getProjectByShareToken = async (shareToken) => {
  const q = query(collection(db, 'projects'), where('shareToken', '==', shareToken))
  const snapshot = await getDocs(q)
  return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null
}

export const deleteProject = async (projectId) => {
  return deleteProjectApi(projectId)
}

// ─── Videos (subcollection under project) ───────────────────

export const addVideoToProject = async (projectId, data) => {
  const result = await createVersion(projectId, {
    requestId: data.requestId,
    title: data.title,
    videoUrl: data.videoUrl,
    publicId: data.publicId || '',
    assetId: data.assetId || '',
    duration: data.duration,
  })
  return result.videoId
}

export const getProjectVideos = async (projectId) => {
  const q = query(
    collection(db, 'projects', projectId, 'videos'),
    orderBy('createdAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const deleteVideo = async (projectId, videoId) => {
  return deleteVersionApi(projectId, videoId)
}

// Existing Arena projects were created before status was stored per video.
// For those legacy projects, infer which version carried the last project
// decision from statusUpdatedAt + version creation order. New uploads always
// have an explicit video status and bypass this fallback.
export const sortVideosByCreatedAt = (videos = []) => [...videos].sort((a, b) => {
  const aTime = a?.createdAt?.toMillis?.() || 0
  const bTime = b?.createdAt?.toMillis?.() || 0
  return aTime - bTime
})

export const getLatestVideo = (videos = []) => {
  const ordered = sortVideosByCreatedAt(videos)
  return ordered[ordered.length - 1] || null
}

export const getProjectCurrentStatus = (project, videos = []) => {
  const ordered = sortVideosByCreatedAt(videos)
  const latest = ordered[ordered.length - 1]
  return latest ? getEffectiveVideoStatus(project, latest, ordered) : (project?.status || 'pending')
}

export const getEffectiveVideoStatus = (project, video, videos = []) => {
  // Explicit non-pending video decisions always win. A pending video can
  // also represent a client decision stored on the project summary for a
  // legacy project.
  if (video?.status && video.status !== 'pending') return video.status

  const projectStatus = project?.status || 'pending'
  if (projectStatus === 'pending') return 'pending'

  const updatedAt = project?.statusUpdatedAt?.toMillis?.()
  if (!updatedAt) return 'pending'

  const priorVersions = videos
    .filter(v => v?.createdAt?.toMillis?.())
    .filter(v => v.createdAt.toMillis() <= updatedAt)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())

  const decisionVersion = priorVersions[0]
  return decisionVersion?.id === video?.id ? projectStatus : 'pending'
}

// ─── Comments (subcollection under video) ───────────────────

export const addComment = async (projectId, videoId, data) => {
  await addDoc(collection(db, 'projects', projectId, 'videos', videoId, 'comments'), {
    timestamp: data.timestamp,
    text: data.text,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    resolved: false,
    createdAt: serverTimestamp()
  })
}

export const getComments = async (projectId, videoId) => {
  const q = query(collection(db, 'projects', projectId, 'videos', videoId, 'comments'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const updateComment = async (projectId, videoId, commentId, data) => {
  if (typeof data?.resolved !== 'boolean') throw new Error('Invalid comment state.')
  await updateDoc(doc(db, 'projects', projectId, 'videos', videoId, 'comments', commentId), {
    resolved: data.resolved,
    updatedAt: serverTimestamp(),
  })
}
