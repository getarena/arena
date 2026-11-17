import { useCallback, useEffect, useRef, useState } from 'react'
import { getComments, getProjectVideos, getEffectiveVideoStatus, getProjectCurrentStatus } from '../lib/firestore'
import { deleteVersion } from '../lib/projectApi'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { ProjectHubLoadingSkeleton } from './Skeleton'
import { ErrorState } from './ErrorState'
import { friendlyError } from '../lib/uiErrors'
import { ShareLinkModal } from './ShareLinkModal'
import { ConfirmDialog } from './ConfirmDialog'

const STATUS_STYLES = {
  pending: { label: 'Awaiting review', cls: 'pending' },
  approved: { label: 'Approved', cls: 'approved' },
  changes_requested: { label: 'Changes requested', cls: 'changes' },
}

function formatTime(seconds = 0) {
  return `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, '0')}`
}

function VersionPreview({ videoUrl, label }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = async (event) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    try {
      if (video.paused) await video.play()
      else video.pause()
    } catch (error) {
      console.error('Could not toggle version preview.', error)
    }
  }

  return (
    <div className="project-version-preview">
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        preload="metadata"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        aria-label={`${label} video preview`}
      />
      <button
        type="button"
        className={`project-version-play ${isPlaying ? 'is-playing' : ''}`}
        onClick={togglePlay}
        aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
        title={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
      </button>
    </div>
  )
}

function formatDate(value) {
  try {
    if (!value) return '—'
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function ProjectHub({ project, onBack, onOpenReview, onUploadVersion, onProjectChange }) {
  const [videos, setVideos] = useState([])
  const [commentCounts, setCommentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteVideoId, setDeleteVideoId] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLoadError(null)
      const nextVideos = await getProjectVideos(project.id)
      setVideos(nextVideos)
      const counts = {}
      await Promise.all(nextVideos.map(async (video) => {
        try {
          const comments = await getComments(project.id, video.id)
          counts[video.id] = { total: comments.length, open: comments.filter((comment) => !comment.resolved).length }
        } catch {
          counts[video.id] = { total: 0, open: 0 }
        }
      }))
      setCommentCounts(counts)
    } catch (error) {
      console.error(error)
      setLoadError(friendlyError(error, 'We could not load this project right now.'))
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => { queueMicrotask(load) }, [load])

  const handleDelete = (video) => {
    setDeleteVideoId(video.id)
  }

  const confirmDeleteVideo = async () => {
    if (!deleteVideoId) return
    setDeletingVideo(true)
    try {
      await deleteVersion(project.id, deleteVideoId)
      await load()
      notify('Version deleted.', 'success')
      setDeleteVideoId(null)
    } catch (error) {
      console.error(error)
      notify('Could not delete that version.', 'error')
    } finally {
      setDeletingVideo(false)
    }
  }

  if (loading) return <ProjectHubLoadingSkeleton />
  if (loadError) return <main className="project-hub-page"><div className="project-hub-shell"><button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={16} /> Projects</button><ErrorState eyebrow="PROJECT" title="This project could not load." message={loadError} onRetry={load} /></div></main>

  const totalNotes = Object.values(commentCounts).reduce((sum, item) => sum + (item?.total || 0), 0)
  const openNotes = Object.values(commentCounts).reduce((sum, item) => sum + (item?.open || 0), 0)
  const currentStatus = getProjectCurrentStatus(project, videos)
  const currentStatusLabel = (STATUS_STYLES[currentStatus] || STATUS_STYLES.pending).label

  return (
    <main className="project-hub-page">
      <div className="project-hub-shell">
        <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={16} /> Projects</button>

        <div className="project-hub-head">
          <div>
            <div className="eyebrow">PROJECT</div>
            <h1>{project.title}</h1>
            <p>Every version, decision and timestamped note stays attached to the same review room.</p>
          </div>
          <div className="project-hub-actions">
            <button className="btn-secondary" onClick={() => setShareOpen(true)}><Icon name="share" size={15} /> Share</button>
            <button className="btn-secondary" onClick={onOpenReview}><Icon name="video" size={15} /> Open review room</button>
            <button className="btn-primary" onClick={onUploadVersion}><Icon name="plus" size={15} /> Upload version</button>
          </div>
        </div>

        <section className="project-hub-summary">
          <div><span>Versions</span><strong>{videos.length}</strong></div>
          <div><span>Latest upload</span><strong>{videos.length ? formatDate(videos[videos.length - 1].createdAt) : '—'}</strong></div>
          <div><span>Current status</span><strong>{videos.length ? currentStatusLabel : 'No videos'}</strong></div>
          <div><span>Open notes</span><strong>{openNotes}</strong></div>
        </section>

        <section>
          <div className="section-heading-row project-hub-section-heading">
            <div><div className="eyebrow">VERSION HISTORY</div><h2>All cuts</h2></div>
            <span className="section-count">{videos.length}</span>
          </div>

          {loading ? (
            <div className="project-hub-grid">
              {[0, 1, 2].map((item) => <div className="project-version-skeleton" key={item} />)}
            </div>
          ) : videos.length === 0 ? (
            <div className="dashboard-empty"><div className="empty-mark"><Icon name="video" size={22} /></div><div><h3>No versions yet.</h3><p>Add the first cut to start collecting feedback.</p></div><button className="btn-secondary compact" onClick={onUploadVersion}>Upload version <Icon name="arrowRight" size={15} /></button></div>
          ) : (
            <div className="project-hub-grid">
              {videos.map((video, index) => {
                const status = STATUS_STYLES[getEffectiveVideoStatus(project, video, videos)] || STATUS_STYLES.pending
                return (
                  <article key={video.id} className="project-version-card">
                    <div className="project-version-preview-wrap">
                      <VersionPreview videoUrl={video.videoUrl} label={`Version ${index + 1}`} />
                      <div className="project-version-overlay"><span>V{index + 1}</span><b>{formatTime(video.duration)}</b></div>
                    </div>
                    <div className="project-version-body">
                      <div className="project-version-title-row"><div><div className="version-kicker">VERSION {String(index + 1).padStart(2, '0')}</div><h3>{video.title || `Version ${index + 1}`}</h3></div><span className={`status-badge ${status.cls}`}><i />{status.label}</span></div>
                      <div className="project-version-meta"><span>{formatDate(video.createdAt)}</span><span>{commentCounts[video.id]?.total || 0} note{(commentCounts[video.id]?.total || 0) !== 1 ? 's' : ''}</span></div>
                      {video.statusReason ? <p className="project-version-reason">{video.statusReason}</p> : null}
                      <div className="project-version-actions"><button className="row-action primary" onClick={() => onOpenReview(video.id)}><Icon name="video" size={13} /> Review</button><button className="row-action" onClick={() => handleDelete(video)}><Icon name="trash" size={13} /> Delete</button></div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
        {shareOpen ? <ShareLinkModal project={project} onClose={() => setShareOpen(false)} onProjectChange={onProjectChange} /> : null}
        {deleteVideoId ? (() => { const target = videos.find((item) => item.id === deleteVideoId); return <ConfirmDialog title={`Delete “${target?.title || 'this version'}”?`} message="The version will be removed from this project. This action cannot be undone." confirmLabel="Delete version" onCancel={() => setDeleteVideoId(null)} onConfirm={confirmDeleteVideo} busy={deletingVideo} /> })() : null}
      </div>
    </main>
  )
}
