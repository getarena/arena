import { useCallback, useState, useEffect, useRef } from 'react'
import { getComments, addComment, getProjectVideos, getEffectiveVideoStatus, updateComment } from '../lib/firestore'
import { deleteVersion } from '../lib/projectApi'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { openArenaInSameTab } from '../lib/navigation'
import { ShareLinkModal } from './ShareLinkModal'
import { friendlyError } from '../lib/uiErrors'
import { ReviewLoadingSkeleton, Skeleton } from './Skeleton'
import { ConfirmDialog } from './ConfirmDialog'

const STATUS_LABELS = { approved: 'Approved', changes_requested: 'Changes requested', pending: 'Awaiting review' }

export function VideoReview({ project, user, theme = 'dark', initialVideoId = null, onBack, onProjectChange }) {
  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const videoRef = useRef(null)
  const composerRef = useRef(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [deleteVideoId, setDeleteVideoId] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true)
    try {
      setLoadError(null)
      const data = await getProjectVideos(project.id)
      setVideos(data)
      const target = initialVideoId ? data.find((video) => video.id === initialVideoId) : null
      setSelectedVideo(target || data[data.length - 1] || null)
      setCurrentTime(0)
    } catch (error) {
      console.error(error)
      setLoadError(friendlyError(error, 'We could not load the project versions right now.'))
    } finally { setLoadingVideos(false) }
  }, [project.id, initialVideoId])

  const loadComments = useCallback(async () => {
    setLoadingComments(true)
    try {
      const data = await getComments(project.id, selectedVideo.id)
      setComments(data.sort((a, b) => a.timestamp - b.timestamp))
    } catch (error) {
      console.error(error)
      notify('Could not load notes for this cut.', 'error')
    } finally { setLoadingComments(false) }
  }, [project.id, selectedVideo])

  useEffect(() => { queueMicrotask(loadVideos) }, [loadVideos])
  useEffect(() => { if (selectedVideo) queueMicrotask(loadComments) }, [loadComments, selectedVideo])

  const formatTime = (seconds = 0) => `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, '0')}`
  const jumpTo = (timestamp) => { if (videoRef.current) videoRef.current.currentTime = timestamp; setCurrentTime(timestamp) }
  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (video.paused) await video.play()
      else video.pause()
    } catch (error) {
      console.error('Could not toggle video playback.', error)
    }
  }
  const duration = Number(selectedVideo?.duration || 0)
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const statusKey = selectedVideo ? getEffectiveVideoStatus(project, selectedVideo, videos) : 'pending'
  const unresolvedCount = comments.filter((comment) => !comment.resolved).length

  useEffect(() => {
    const handleShortcut = (event) => {
      const tag = event.target?.tagName?.toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable
      if (typing || !selectedVideo) return

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? -5 : 5
        const next = Math.max(0, Math.min(duration || Infinity, (videoRef.current?.currentTime || currentTime) + delta))
        jumpTo(next)
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        composerRef.current?.focus()
      }

      if (event.key.toLowerCase() === 'j') {
        event.preventDefault()
        const index = videos.findIndex((video) => video.id === selectedVideo.id)
        if (index > 0) { setSelectedVideo(videos[index - 1]); setCurrentTime(0) }
      }

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const index = videos.findIndex((video) => video.id === selectedVideo.id)
        if (index < videos.length - 1) { setSelectedVideo(videos[index + 1]); setCurrentTime(0) }
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [selectedVideo, videos, duration, currentTime])

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedVideo) return
    setLoading(true)
    try {
      await addComment(project.id, selectedVideo.id, { timestamp: currentTime, text: newComment.trim(), clientName: user?.displayName || 'Editor', clientEmail: user?.email || '' })
      setNewComment('')
      await loadComments()
      notify('Note added to the timeline.', 'success')
    } catch (error) {
      console.error(error)
      notify('Failed to add the note.', 'error')
    } finally { setLoading(false) }
  }

  const handleResolve = async (comment) => {
    try {
      await updateComment(project.id, selectedVideo.id, comment.id, { resolved: !comment.resolved })
      setComments((items) => items.map((item) => item.id === comment.id ? { ...item, resolved: !comment.resolved } : item))
      notify(comment.resolved ? 'Note reopened.' : 'Note marked as resolved.', 'success')
    } catch (error) {
      console.error(error)
      notify('Could not update that note.', 'error')
    }
  }

  const handleDeleteVideo = (videoId) => {
    if (!videoId) return
    setDeleteVideoId(videoId)
  }

  const confirmDeleteVideo = async () => {
    if (!deleteVideoId) return
    setDeletingVideo(true)
    try {
      const result = await deleteVersion(project.id, deleteVideoId)
      const updated = videos.filter((video) => video.id !== deleteVideoId)
      setVideos(updated)
      setSelectedVideo(updated.length ? updated[updated.length - 1] : null)
      onProjectChange?.({ ...project, status: result.status || 'pending', statusReason: result.statusReason || '' })
      notify('Version deleted.', 'success')
      setDeleteVideoId(null)
    } catch (error) {
      console.error(error)
      notify('Failed to delete the version.', 'error')
    } finally {
      setDeletingVideo(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/review/${project.shareToken}`)
      setCopied(true)
      notify('Review link copied.', 'success')
      setTimeout(() => setCopied(false), 1800)
    } catch { notify('Could not copy the review link.', 'error') }
  }

  const handleOpenReview = () => openArenaInSameTab(`${window.location.origin}/review/${project.shareToken}`)

  if (loadingVideos) return <ReviewLoadingSkeleton theme={theme} />
  if (loadError) return <div className={`editor-review-page review-theme-${theme}`}><div className="review-topbar"><button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={15} /> Projects</button><div className="review-breadcrumb"><span>{project.title}</span><i>/</i><strong>Review room</strong></div></div><div className="review-error-wrap"><div className="error-state error-state-dark"><div className="error-state-mark"><Icon name="x" size={19} /></div><div className="error-state-copy"><div className="eyebrow">REVIEW ROOM</div><h3>This review room could not load.</h3><p>{loadError}</p></div><div className="error-state-actions"><button type="button" className="btn-secondary compact" onClick={loadVideos}>Try again</button></div></div></div></div>

  return (
    <div className={`editor-review-page review-theme-${theme}`}>
      <div className="review-topbar">
        <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={15} /> Projects</button>
        <div className="review-breadcrumb"><span>{project.title}</span><i>/</i><strong>Review room</strong></div>
        <div className="review-topbar-actions"><button className={`review-tool-btn ${showShortcuts ? 'active' : ''}`} onClick={() => setShowShortcuts((value) => !value)}><Icon name="spark" size={14} /> Shortcuts</button><button className="review-tool-btn" onClick={handleOpenReview}><Icon name="external" size={14} /> Client view</button><button className="review-tool-btn" onClick={() => setShareOpen(true)}><Icon name="link" size={14} /> Share</button><button className={`review-tool-btn ${copied ? 'copied' : ''}`} onClick={handleCopyLink}><Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied' : 'Copy link'}</button></div>
      </div>

      <div className="review-workspace">
        <div className="review-main-stage">
          <div className="review-stage-head"><div><div className="eyebrow">CURRENT CUT</div><div className="review-title-line"><h1>{selectedVideo?.title || 'No video uploaded'}</h1>{selectedVideo && <span className={`review-status-chip ${statusKey}`}><i />{STATUS_LABELS[statusKey] || STATUS_LABELS.pending}</span>}</div>{selectedVideo && <p className="review-version-meta">Version {videos.findIndex((video) => video.id === selectedVideo.id) + 1} · {duration ? formatTime(duration) : 'Duration unavailable'}</p>}</div><div className="review-stage-actions"><span className="subtle-status"><Icon name="message" size={13} /> {comments.length} note{comments.length !== 1 ? 's' : ''} · {unresolvedCount} open</span></div></div>

          {videos.length > 0 && <div className="version-strip">{videos.map((video, index) => <button key={video.id} className={selectedVideo?.id === video.id ? 'active' : ''} onClick={() => { setSelectedVideo(video); setCurrentTime(0) }}><span className="version-index">{String(index + 1).padStart(2, '0')}</span><span>{video.title || `Version ${index + 1}`}</span><small className={`version-status-dot ${getEffectiveVideoStatus(project, video, videos)}`} aria-hidden="true" /></button>)}</div>}

          {!selectedVideo ? <div className="review-no-video"><Icon name="video" size={24} /><p>No videos yet.</p></div> : <div className="video-stage"><video key={selectedVideo.id} ref={videoRef} src={selectedVideo.videoUrl} controls preload="metadata" onTimeUpdate={(event) => setCurrentTime(event.target.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} /><button type="button" className={`video-play-overlay ${isPlaying ? "is-playing" : ""}`} onClick={togglePlay} aria-label={isPlaying ? "Pause video" : "Play video"} title={isPlaying ? "Pause video" : "Play video"}><Icon name={isPlaying ? "pause" : "play"} size={18} /></button><div className="video-stage-caption"><span>{selectedVideo.title}</span><span>{formatTime(currentTime)}{duration ? ` / ${formatTime(duration)}` : ''}</span></div></div>}

          <div className="timeline-card"><div className="timeline-head"><span>Feedback timeline</span><span className="timeline-time">{formatTime(currentTime)}</span></div><div className="timeline-wrap"><span>0:00</span><div className="timeline-track"><div className="timeline-progress" style={{ width: `${progress}%` }} />{comments.map((comment) => <button key={comment.id} className={`timeline-marker ${comment.resolved ? 'resolved' : ''}`} style={{ left: `${Math.min(98, (comment.timestamp / Math.max(duration, 1)) * 100)}%` }} onClick={() => jumpTo(comment.timestamp)} aria-label={`Jump to feedback at ${formatTime(comment.timestamp)}`} title={`${comment.resolved ? 'Resolved' : 'Feedback'} at ${formatTime(comment.timestamp)}`} />)}</div><span>{duration ? formatTime(duration) : '—'}</span></div>{comments.length > 0 && <div className="timeline-legend"><span><i className="open" /> Open</span><span><i className="resolved" /> Resolved</span><small>Click a marker to jump to that moment.</small></div>}</div>
        </div>

        <aside className="review-sidebar">
          <div className="sidebar-heading"><div><div className="eyebrow">FEEDBACK</div><h2>{comments.length} note{comments.length !== 1 ? 's' : ''}</h2></div><button className="icon-button" onClick={() => handleDeleteVideo(selectedVideo?.id)} disabled={!selectedVideo} aria-label="Delete this version" title="Delete version"><Icon name="trash" size={15} /></button></div>
          <div className="comments-list review-comments">
            {loadingComments ? <div className="review-comment-loading" aria-label="Loading notes" aria-busy="true">{[0, 1, 2].map((item) => <div className="sk-comment" key={item}><Skeleton className="sk-comment-line short" /><Skeleton className="sk-comment-line" /><Skeleton className="sk-comment-line medium" /></div>)}</div> : comments.length === 0 ? <div className="empty-feedback"><div className="empty-feedback-mark"><Icon name="message" size={18} /></div><strong>No notes on this cut yet.</strong><span>Pause the video and leave a note at the current time.</span></div> : comments.map((comment) => <div key={comment.id} className={`review-comment-wrap ${comment.resolved ? 'resolved' : ''}`}><button className="review-comment" onClick={() => jumpTo(comment.timestamp)}><div className="review-comment-top"><span>{formatTime(comment.timestamp)}</span><span>{comment.clientName || 'Editor'}</span></div><p>{comment.text}</p></button><button className="comment-resolve" onClick={() => handleResolve(comment)}>{comment.resolved ? <><Icon name="checkCircle" size={12} /> Reopen</> : <><Icon name="check" size={12} /> Resolve</>}</button></div>)}
          </div>
          <div className="review-composer"><div className="composer-time"><Icon name="clock" size={14} /> Note at <strong>{formatTime(currentTime)}</strong></div><textarea ref={composerRef} value={newComment} onChange={(event) => setNewComment(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleAddComment() }} placeholder="Write a note for this moment…" aria-label="Feedback note" /><button className="btn-primary" onClick={handleAddComment} disabled={loading || !selectedVideo}>{loading ? 'Posting…' : <>Post note <Icon name="arrowRight" size={15} /></>}</button><span className="composer-hint">⌘ / Ctrl + Enter to post · ← → 5s · N note · J/K versions</span></div>
        </aside>
      </div>
      {showShortcuts ? <div className="review-shortcuts-popover" role="dialog" aria-label="Review room shortcuts"><div><strong>Review room shortcuts</strong><button type="button" className="icon-button" onClick={() => setShowShortcuts(false)} aria-label="Close shortcuts"><Icon name="x" size={14} /></button></div><p><kbd>←</kbd><kbd>→</kbd> Move 5 seconds</p><p><kbd>N</kbd> Focus note composer</p><p><kbd>J</kbd><kbd>K</kbd> Previous / next version</p><p><kbd>⌘</kbd><kbd>Enter</kbd> Post note</p></div> : null}
      {shareOpen ? <ShareLinkModal project={project} onClose={() => setShareOpen(false)} onProjectChange={onProjectChange} /> : null}
      {deleteVideoId ? (() => { const target = videos.find((item) => item.id === deleteVideoId); return <ConfirmDialog title={`Delete “${target?.title || 'this version'}”?`} message="The version will be removed from this project. This action cannot be undone." confirmLabel="Delete version" onCancel={() => setDeleteVideoId(null)} onConfirm={confirmDeleteVideo} busy={deletingVideo} /> })() : null}
    </div>
  )
}
