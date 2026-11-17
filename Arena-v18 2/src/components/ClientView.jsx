import { useCallback, useEffect, useRef, useState } from 'react'
import { Navbar } from './Navbar'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { ClientLoadingSkeleton } from './Skeleton'
import { friendlyError } from '../lib/uiErrors'
import { authenticateReview, loadReview, loadReviewComments, postReviewComment, submitReviewDecision } from '../lib/reviewApi'

const STATUS_LABELS = { approved: 'Approved', changes_requested: 'Changes requested', pending: 'Awaiting your review' }

function getSavedReviewerIdentity(shareToken) {
  try {
    const saved = localStorage.getItem(`arena:reviewer:${shareToken}`)
    if (!saved) return { name: '', email: '' }
    const parsed = JSON.parse(saved)
    const name = typeof parsed?.name === 'string' ? parsed.name : ''
    // Migrate older entries that stored email locally; email is now memory-only
    // and is sent only with the feedback submission that needs it.
    if (parsed?.email) {
      try { localStorage.setItem(`arena:reviewer:${shareToken}`, JSON.stringify({ name })) } catch { /* best effort */ }
    }
    return { name, email: '' }
  } catch {
    return { name: '', email: '' }
  }
}

export function ClientView({ shareToken, theme = 'light', onThemeChange }) {
  const reviewerIdentity = getSavedReviewerIdentity(shareToken)
  const [project, setProject] = useState(null)
  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [clientName, setClientName] = useState(() => reviewerIdentity.name)
  const [clientEmail, setClientEmail] = useState(() => reviewerIdentity.email)
  const [submitted, setSubmitted] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [commenting, setCommenting] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState(null)
  const [changesReason, setChangesReason] = useState('')
  const [showChangesInput, setShowChangesInput] = useState(false)
  const [submittingApproval, setSubmittingApproval] = useState(false)
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const loadProject = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadReview(shareToken)
      setPasswordRequired(false)
      setProject(data.project)
      setVideos(data.videos || [])
      const latest = (data.videos || [])[data.videos?.length - 1]
      if (latest) {
        setSelectedVideo(latest)
        setApprovalStatus(latest.status || data.project?.status || 'pending')
      } else {
        setApprovalStatus('pending')
      }
    } catch (err) {
      console.error(err)
      if (err?.requiresPassword || err?.code === 'review_password_required') {
        setPasswordRequired(true)
        setProject(null)
        setVideos([])
        setSelectedVideo(null)
        setError(null)
      } else {
        setError(err?.code === 'review_paused' ? 'The project owner has temporarily paused this review link.' : friendlyError(err, 'We could not load this review right now.'))
      }
    } finally {
      setLoading(false)
    }
  }, [shareToken])

  const loadComments = useCallback(async (videoId) => {
    try {
      const data = await loadReviewComments(shareToken, videoId)
      setComments(data.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0)))
    } catch (errorLoading) {
      console.error(errorLoading)
      if (errorLoading?.requiresPassword) {
        setPasswordRequired(true)
        setSubmitted(false)
        setProject(null)
      } else {
        notify('Could not load feedback for this cut.', 'error')
      }
    }
  }, [shareToken])

  useEffect(() => { queueMicrotask(loadProject) }, [loadProject])
  useEffect(() => { if (selectedVideo && !passwordRequired) queueMicrotask(() => loadComments(selectedVideo.id)) }, [loadComments, selectedVideo, passwordRequired])

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (!passwordInput) return
    setPasswordSubmitting(true)
    try {
      await authenticateReview(shareToken, passwordInput)
      setPasswordInput('')
      notify('Review unlocked for this device.', 'success')
      await loadProject()
    } catch (error) {
      console.error(error)
      notify(error?.message || 'Could not unlock this review.', 'error')
    } finally {
      setPasswordSubmitting(false)
    }
  }

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

  const handleSubmitInfo = (event) => {
    event.preventDefault()
    const normalizedName = clientName.trim()
    const normalizedEmail = clientEmail.trim().toLowerCase()
    if (!normalizedName || !normalizedEmail) {
      notify('Enter your name and email to continue.', 'error')
      return
    }
    setClientName(normalizedName)
    setClientEmail(normalizedEmail)
    try {
      localStorage.setItem(`arena:reviewer:${shareToken}`, JSON.stringify({ name: normalizedName }))
    } catch {
      // Local storage can be unavailable in private/restricted browser contexts.
    }
    setSubmitted(true)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !project || !selectedVideo) return
    setCommenting(true)
    try {
      const result = await postReviewComment(shareToken, {
        videoId: selectedVideo.id,
        timestamp: currentTime,
        text: newComment.trim(),
        clientName,
        clientEmail,
      })
      setNewComment('')
      if (result?.comment) {
        setComments((items) => [...items, result.comment].sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0)))
      } else {
        await loadComments(selectedVideo.id)
      }
      notify('Feedback added to the cut.', 'success')
    } catch (error) {
      console.error(error)
      if (error?.requiresPassword) {
        setPasswordRequired(true)
        setSubmitted(false)
        return
      }
      notify(error?.message || 'Failed to add feedback.', 'error')
    } finally {
      setCommenting(false)
    }
  }

  const applyDecision = (result) => {
    const nextStatus = result.status
    const nextReason = result.statusReason || ''
    const nextTimestamp = result.statusUpdatedAt
    const decidedVideoId = result.videoId || selectedVideo?.id
    setApprovalStatus(nextStatus)
    setVideos((items) => items.map((video) => video.id === decidedVideoId ? { ...video, status: nextStatus, statusReason: nextReason, statusUpdatedAt: nextTimestamp } : video))
    setSelectedVideo((current) => current ? { ...current, status: nextStatus, statusReason: nextReason, statusUpdatedAt: nextTimestamp } : current)
    if (result?.projectStatus) {
      setProject((current) => current ? {
        ...current,
        status: result.projectStatus,
        statusReason: result.projectStatusReason || '',
        statusUpdatedAt: result.projectStatusUpdatedAt || nextTimestamp,
      } : current)
    }
  }

  const handleApprove = async () => {
    if (!selectedVideo) return
    setSubmittingApproval(true)
    try {
      const result = await submitReviewDecision(shareToken, { videoId: selectedVideo.id, status: 'approved' })
      applyDecision(result)
      notify('This version is now approved.', 'success')
    } catch (error) {
      console.error(error)
      if (error?.requiresPassword) {
        setPasswordRequired(true)
        setSubmitted(false)
        return
      }
      notify(error?.message || 'Failed to submit approval.', 'error')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!changesReason.trim()) {
      notify('Add a short description of what needs to change.', 'error')
      return
    }
    if (!selectedVideo) return
    setSubmittingApproval(true)
    try {
      const result = await submitReviewDecision(shareToken, {
        videoId: selectedVideo.id,
        status: 'changes_requested',
        reason: changesReason.trim(),
      })
      applyDecision(result)
      setChangesReason('')
      setShowChangesInput(false)
      notify('Changes request sent to the editor.', 'success')
    } catch (error) {
      console.error(error)
      if (error?.requiresPassword) {
        setPasswordRequired(true)
        setSubmitted(false)
        return
      }
      notify(error?.message || 'Failed to submit the change request.', 'error')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const formatTime = (seconds = 0) => `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, '0')}`
  const jumpTo = (timestamp) => { if (videoRef.current) videoRef.current.currentTime = timestamp; setCurrentTime(timestamp) }
  const duration = Number(selectedVideo?.duration || 0)
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const statusKey = approvalStatus || 'pending'
  const openNotes = comments.filter((comment) => !comment.resolved).length

  if (loading) return <ClientLoadingSkeleton theme={theme} />
  if (passwordRequired) return (
    <div className={`client-view client-entry-view theme-${theme}`}>
      <Navbar isClientView theme={theme} onThemeChange={onThemeChange} />
      <div className="client-password-entry">
        <div className="client-password-card">
          <div className="client-password-mark"><Icon name="lock" size={21} /></div>
          <div className="eyebrow">PROTECTED REVIEW</div>
          <h1>This review is password protected.</h1>
          <p>The project owner added an extra layer of access control. Enter the review password they shared with you.</p>
          <form onSubmit={handlePasswordSubmit}>
            <label className="field-block"><span>Review password</span><input autoFocus required type="password" minLength={1} value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} className="input-field large" placeholder="Enter the password" disabled={passwordSubmitting} /></label>
            <button type="submit" className="btn-primary" disabled={passwordSubmitting || !passwordInput}>{passwordSubmitting ? 'Unlocking…' : <>Enter protected review <Icon name="arrowRight" size={15} /></>}</button>
          </form>
          <div className="client-form-foot"><Icon name="lock" size={13} /> Arena never includes the password in the share link.</div>
          <div className="client-privacy-links"><a href="/help" target="_blank" rel="noopener noreferrer">Help</a><span>·</span><a href="/contact" target="_blank" rel="noopener noreferrer">Contact Arena</a></div>
        </div>
      </div>
    </div>
  )

  if (error || !project) return <div className={`client-view theme-${theme}`}><Navbar isClientView theme={theme} onThemeChange={onThemeChange} /><div className="client-error"><Icon name="link" size={22} /><h2>Review unavailable</h2><p>{error || 'Video not found.'}</p><button type="button" className="btn-secondary compact" onClick={loadProject}>Try again <Icon name="arrowRight" size={14} /></button><div className="client-error-links"><a href="/help" target="_blank" rel="noopener noreferrer">Help</a><span>·</span><a href="/contact" target="_blank" rel="noopener noreferrer">Contact Arena</a><span>·</span><a href="/">Arena home</a></div></div></div>

  if (!submitted) return (
    <div className={`client-entry-view client-view theme-${theme}`}>
      <Navbar isClientView theme={theme} onThemeChange={onThemeChange} />
      <div className="client-entry">
        <div className="client-entry-copy">
          <div className="eyebrow">PRIVATE REVIEW</div>
          <div className="entry-title-row"><h1>{project.title}</h1><span className="entry-status"><i /> {videos.length} version{videos.length !== 1 ? 's' : ''}</span></div>
          <p>Arena keeps feedback attached to the exact moment in the video. No account, app, or setup required.</p>
          <div className="entry-points"><div><Icon name="clock" size={15} /><span>Comment at exact timestamps</span></div><div><Icon name="link" size={15} /><span>Everything stays on one private link</span></div><div><Icon name="check" size={15} /><span>Approve or request changes when you're done</span></div></div>
        </div>
        <div className="form-card client-form-card">
          <div className="form-card-kicker">BEFORE YOU START</div><h2>Tell the editor who's reviewing.</h2><p className="form-subtitle">Your name appears next to your notes so the conversation stays clear.</p>
          <form onSubmit={handleSubmitInfo}><label className="field-block"><span>Name</span><input required type="text" maxLength="120" placeholder="Your name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="input-field large" /></label><label className="field-block"><span>Email</span><input required type="email" maxLength="254" placeholder="you@company.com" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="input-field large" /></label><button type="submit" className="btn-primary">Enter review room <Icon name="arrowRight" size={15} /></button></form>
          <div className="client-form-foot"><Icon name="lock" size={13} /> Your details are used to label feedback. Your feedback is shared with the project owner.</div><div className="client-privacy-links"><a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a><span>·</span><a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a><span>·</span><a href="/help" target="_blank" rel="noopener noreferrer">Help</a></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`client-view theme-${theme}`}>
      <Navbar isClientView theme={theme} onThemeChange={onThemeChange} />
      <main className="client-review-page">
        <div className="client-review-head"><div><div className="eyebrow">REVIEW ROOM</div><div className="client-title-row"><h1>{project.title}</h1><span className={`client-status-pill ${statusKey}`}><i /> {STATUS_LABELS[statusKey] || STATUS_LABELS.pending}</span></div><p>{videos.length} version{videos.length !== 1 ? 's' : ''} · Reviewing as {clientName}</p></div><div className="client-head-detail"><Icon name="lock" size={14} /> Private review · {openNotes} open {openNotes === 1 ? 'note' : 'notes'}</div></div>
        <div className="client-privacy-notice"><Icon name="lock" size={13} /><span>Your feedback is shared with the project owner. Please do not include unrelated confidential information in review notes.</span><a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a></div>

        {(approvalStatus === 'approved' || approvalStatus === 'changes_requested') && <div className={`client-status-banner ${approvalStatus}`}><div className="banner-icon"><Icon name={approvalStatus === 'approved' ? 'check' : 'message'} size={15} /></div><div><strong>{approvalStatus === 'approved' ? `${selectedVideo?.title || 'This version'} is approved.` : 'Changes were requested for this version.'}</strong><span>{selectedVideo?.statusReason || (approvalStatus === 'approved' ? 'The current version is marked approved.' : 'The editor has been notified.')}</span></div></div>}

        {videos.length > 1 && <div className="client-version-row"><span>Versions</span><div className="version-strip client-version-strip">{videos.map((video, index) => { const videoStatus = video.status || 'pending'; return <button key={video.id} className={selectedVideo?.id === video.id ? 'active' : ''} onClick={() => { setSelectedVideo(video); setCurrentTime(0); setApprovalStatus(videoStatus); setShowChangesInput(false); setChangesReason('') }}><span className="version-index">{String(index + 1).padStart(2, '0')}</span><span>{video.title || `Version ${index + 1}`}</span><small className={`version-status-dot ${videoStatus}`} aria-hidden="true" />{video.duration ? <small>{formatTime(video.duration)}</small> : null}</button> })}</div></div>}

        {selectedVideo && <div className="client-review-grid">
          <div className="client-video-column"><div className="client-video-meta"><span>{selectedVideo.title}</span><span>Version {videos.findIndex((video) => video.id === selectedVideo.id) + 1}</span></div><div className="client-video-shell"><video key={selectedVideo.id} ref={videoRef} src={selectedVideo.videoUrl} controls preload="metadata" onTimeUpdate={(event) => setCurrentTime(event.target.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} /><button type="button" className={`video-play-overlay ${isPlaying ? "is-playing" : ""}`} onClick={togglePlay} aria-label={isPlaying ? "Pause video" : "Play video"} title={isPlaying ? "Pause video" : "Play video"}><Icon name={isPlaying ? "pause" : "play"} size={18} /></button></div><div className="timeline-card client-timeline"><div className="timeline-head"><span>Feedback timeline</span><span>{formatTime(currentTime)}</span></div><div className="timeline-wrap"><span>0:00</span><div className="timeline-track"><div className="timeline-progress" style={{ width: `${progress}%` }} />{comments.map((comment) => <button key={comment.id} className={`timeline-marker ${comment.resolved ? 'resolved' : ''}`} style={{ left: `${Math.min(98, (Number(comment.timestamp || 0) / Math.max(duration, 1)) * 100)}%` }} onClick={() => jumpTo(Number(comment.timestamp || 0))} title={`${comment.resolved ? 'Resolved' : 'Feedback'} at ${formatTime(comment.timestamp)}`} aria-label={`Jump to feedback at ${formatTime(comment.timestamp)}`} />)}</div><span>{duration ? formatTime(duration) : '—'}</span></div><div className="timeline-legend"><span><i className="open" /> Open</span><span><i className="resolved" /> Resolved</span><small>Click a marker to jump to that moment.</small></div></div></div>

          <aside className="client-feedback-panel"><div className="sidebar-heading"><div><div className="eyebrow">FEEDBACK</div><h2>{comments.length} note{comments.length !== 1 ? 's' : ''}</h2></div><span className="sidebar-status">{formatTime(currentTime)}</span></div><div className="comments-list review-comments">{comments.length === 0 ? <div className="empty-feedback"><div className="empty-feedback-mark"><Icon name="message" size={18} /></div><strong>Start the conversation.</strong><span>Pause anywhere in the video and leave a note for the editor.</span></div> : comments.map((comment) => <button key={comment.id} className={`review-comment ${comment.resolved ? 'resolved' : ''}`} onClick={() => jumpTo(Number(comment.timestamp || 0))}><div className="review-comment-top"><span>{formatTime(comment.timestamp)}</span><span>{comment.resolved ? 'Resolved' : comment.clientName}</span></div><p>{comment.text}</p></button>)}</div><div className="review-composer"><div className="composer-time"><Icon name="clock" size={14} /> Note at <strong>{formatTime(currentTime)}</strong></div><textarea value={newComment} maxLength={2000} onChange={(event) => setNewComment(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleAddComment() }} placeholder="What would you like changed here?" aria-label="Feedback note" /><button className="btn-primary" onClick={handleAddComment} disabled={commenting}>{commenting ? 'Posting…' : <>Post feedback <Icon name="arrowRight" size={15} /></>}</button><span className="composer-hint">⌘ / Ctrl + Enter to post</span></div>{approvalStatus === 'pending' && <div className="decision-card"><div className="decision-copy"><div className="eyebrow">READY TO DECIDE?</div><h3>Approve this cut when it feels right.</h3></div><div className="decision-actions"><button className="btn-approve" onClick={handleApprove} disabled={submittingApproval}><Icon name="check" size={16} /> Approve</button><button className="btn-changes" onClick={() => setShowChangesInput((value) => !value)} disabled={submittingApproval}><Icon name="message" size={15} /> Request changes</button></div>{showChangesInput && <div className="decision-change-form"><textarea value={changesReason} maxLength={2000} onChange={(event) => setChangesReason(event.target.value)} placeholder="Briefly describe what needs to change…" /><button className="btn-changes full" onClick={handleRequestChanges} disabled={submittingApproval}>{submittingApproval ? 'Submitting…' : 'Submit changes request'}</button></div>}</div>}</aside>
        </div>}
      </main>
    </div>
  )
}
