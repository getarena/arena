import { useCallback, useState, useEffect, useRef } from 'react'
import { uploadToCloudinary, validateVideoFile } from '../lib/cloudinary'
import { createProject, addVideoToProject, getUserProjects } from '../lib/firestore'
import { newRequestId } from '../lib/projectApi'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { openArenaInSameTab } from '../lib/navigation'
import { friendlyError } from '../lib/uiErrors'

export function Upload({ user, initialProjectId = '', onUploadSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('idle')
  const [mode, setMode] = useState(() => initialProjectId ? 'existing' : 'new')
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectLoadError, setProjectLoadError] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [completedLink, setCompletedLink] = useState('')
  const [completedVersion, setCompletedVersion] = useState('')
  const inputRef = useRef(null)
  const projectRequestIdRef = useRef('')
  const versionRequestIdRef = useRef('')
  const uploadedAssetRef = useRef(null)

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      setProjectLoadError(null)
      const data = await getUserProjects(user.uid)
      setProjects(data)
    } catch (e) {
      console.error(e)
      setProjectLoadError(friendlyError(e, 'We could not load your existing projects.'))
    } finally {
      setLoadingProjects(false)
    }
  }, [user])

  useEffect(() => {
    if (mode === 'existing') queueMicrotask(loadProjects)
  }, [mode, loadProjects])

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    projectRequestIdRef.current = ''
    versionRequestIdRef.current = ''
    uploadedAssetRef.current = null
  }

  const pickFile = (selected) => {
    setUploadError(null)
    const f = selected?.[0]
    if (!f) return
    try {
      validateVideoFile(f)
      setFile(f)
      versionRequestIdRef.current = ''
      uploadedAssetRef.current = null
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleUpload = async () => {
    setUploadError(null)
    setUploadComplete(false)
    if (!file || !videoTitle) {
      notify('Select a video and enter a version title.', 'error')
      return
    }
    if (mode === 'new' && !projectTitle) {
      notify('Enter a project name.', 'error')
      return
    }
    if (mode === 'existing' && !selectedProjectId) {
      notify('Choose a project first.', 'error')
      return
    }

    setLoading(true)
    setUploadStage('authorizing')
    try {
      setProgress(0)
      let projectId = selectedProjectId
      let shareToken = projects.find((item) => item.id === selectedProjectId)?.shareToken || ''

      if (mode === 'new') {
        if (!projectRequestIdRef.current) projectRequestIdRef.current = newRequestId()
        const projectResult = await createProject(user.uid, { title: projectTitle, requestId: projectRequestIdRef.current })
        projectId = projectResult.projectId
        shareToken = projectResult.shareToken
      }

      let uploadResult = uploadedAssetRef.current
      if (!uploadResult) {
        uploadResult = await uploadToCloudinary(file, (value) => {
          setUploadStage('uploading')
          setProgress(value)
        })
        uploadedAssetRef.current = uploadResult
      } else {
        setUploadStage('uploading')
        setProgress(100)
      }

      if (!versionRequestIdRef.current) versionRequestIdRef.current = newRequestId()
      setUploadStage('saving')
      setProgress(92)
      await addVideoToProject(projectId, { ...uploadResult, requestId: versionRequestIdRef.current, title: videoTitle })
      setUploadStage('complete')
      setProgress(100)
      const nextLink = shareToken ? `${window.location.origin}/review/${shareToken}` : ''
      setCompletedLink(nextLink)
      setCompletedVersion(videoTitle.trim())
      setUploadComplete(true)
      projectRequestIdRef.current = ''
      versionRequestIdRef.current = ''
      uploadedAssetRef.current = null
      notify('Version uploaded. Your review room is ready.', 'success')
    } catch (e) {
      console.error(e)
      const message = friendlyError(e, 'We could not finish this upload. Please try again.')
      setUploadError(message)
      notify(e?.message || message, 'error')
    } finally {
      setLoading(false)
      setUploadStage('idle')
      setProgress(0)
    }
  }

  const fileSize = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ''

  const copyCompletedLink = async () => {
    if (!completedLink) return
    try {
      await navigator.clipboard.writeText(completedLink)
      notify('Review link copied.', 'success')
    } catch {
      notify('Could not copy the review link.', 'error')
    }
  }

  if (uploadComplete) return (
    <div className="upload-page upload-complete-page">
      <div className="upload-complete-shell">
        <button className="back-link" onClick={onUploadSuccess}><Icon name="arrowLeft" size={16} /> Back to projects</button>
        <div className="upload-complete-card">
          <div className="upload-complete-mark"><Icon name="check" size={22} /></div>
          <div className="eyebrow">REVIEW ROOM READY</div>
          <h1>{completedVersion || 'Your new version'} is ready to review.</h1>
          <p>The cut is uploaded and attached to your project. You can send the same review link you will keep using for future versions.</p>
          <div className="upload-complete-link"><Icon name="link" size={15} /><span>{completedLink || 'Review link ready'}</span></div>
          <div className="upload-complete-actions">
            {completedLink ? <button type="button" className="btn-primary" onClick={() => openArenaInSameTab(completedLink)}><Icon name="external" size={15} /> Open client review</button> : null}
            <button type="button" className="btn-secondary" onClick={copyCompletedLink} disabled={!completedLink}><Icon name="copy" size={15} /> Copy link</button>
            <button type="button" className="btn-secondary" onClick={onUploadSuccess}>Back to projects</button>
          </div>
          <div className="upload-complete-note"><Icon name="lock" size={13} /> Keep the link private. Anyone who has it can enter the review room.</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="upload-page">
      <div className="upload-shell">
        <div className="upload-side">
          <button className="back-link" onClick={onCancel} disabled={loading}><Icon name="arrowLeft" size={16} /> Back to projects</button>
          <div className="eyebrow">NEW REVIEW</div>
          <h1>Give the next cut a room of its own.</h1>
          <p>Upload your latest edit, name the version, and Arena gives you a clean link to send to the client.</p>

          <div className="upload-notes">
            <div><span>01</span><p>Upload the video once.</p></div>
            <div><span>02</span><p>Send one private review link.</p></div>
            <div><span>03</span><p>Keep every comment attached to time.</p></div>
          </div>
        </div>

        <div className="upload-panel">
          <div className="upload-panel-head">
            <div>
              <div className="eyebrow">SETUP</div>
              <h2>Upload a video</h2>
              <p className="upload-panel-sub">Create the review room before you send the link.</p>
            </div>
            <div className="upload-limit">MP4, MOV, AVI · 100MB max</div>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Project mode">
            <button className={mode === 'new' ? 'active' : ''} onClick={() => switchMode('new')}>
              <span>New project</span>
              <small>Start a new review room</small>
            </button>
            <button className={mode === 'existing' ? 'active' : ''} onClick={() => switchMode('existing')}>
              <span>Add to existing</span>
              <small>Keep versions together</small>
            </button>
          </div>

          <div className="form-grid">
            <label className="field-block">
              <span>{mode === 'new' ? 'Project name' : 'Project'}</span>
              {mode === 'new' ? (
                <input
                  type="text"
                  placeholder="e.g. Summer campaign"
                  value={projectTitle}
                  onChange={(e) => { setProjectTitle(e.target.value); projectRequestIdRef.current = '' }}
                  className="input-field large"
                />
              ) : (
                <>
                  <select className="input-field large" value={selectedProjectId} disabled={loading || loadingProjects} onChange={(e) => { setSelectedProjectId(e.target.value); versionRequestIdRef.current = ''; uploadedAssetRef.current = null }}>
                    <option value="">{loadingProjects ? 'Loading projects…' : 'Choose a project'}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  {projectLoadError ? <div className="field-inline-error"><span>{projectLoadError}</span><button type="button" onClick={loadProjects}>Retry</button></div> : null}
                </>
              )}
            </label>

            <label className="field-block">
              <span>Version title</span>
              <input
                type="text"
                placeholder="e.g. V3 — tighter opening"
                value={videoTitle}
                onChange={(e) => { setVideoTitle(e.target.value); versionRequestIdRef.current = '' }}
                className="input-field large"
              />
            </label>
          </div>

          <div
            className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" onChange={(e) => pickFile(e.target.files)} />
            {file ? (
              <>
                <div className="drop-icon selected"><Icon name="check" size={19} /></div>
                <strong className="drop-file-name">{file.name}</strong>
                <span>{fileSize} · Ready to upload</span>
                <button
                  type="button"
                  className="drop-replace"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                  disabled={loading}
                >
                  Choose a different file
                </button>
              </>
            ) : (
              <>
                <div className="drop-icon"><Icon name="upload" size={20} /></div>
                <strong>Drop your video here</strong>
                <span>or click to browse files</span>
              </>
            )}
          </div>

          {loading && (
            <div className="upload-progress-block" aria-live="polite">
              <div className="upload-progress-copy"><span>{uploadStage === 'authorizing' ? 'Preparing a secure upload' : uploadStage === 'saving' ? 'Saving the new review version' : uploadStage === 'complete' ? 'Upload complete' : 'Uploading your review file'}</span><strong>{progress}%</strong></div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
              <p className="upload-progress-note">{uploadStage === 'saving' ? 'The video is uploaded. Arena is attaching it to your project.' : 'Keep this tab open while Arena finishes the upload.'}</p>
            </div>
          )}

          {uploadError && !loading ? (
            <div className="upload-error" role="alert">
              <div><Icon name="x" size={14} /><span>{uploadError}</span></div>
              <button type="button" onClick={() => setUploadError(null)}>Dismiss</button>
            </div>
          ) : null}

          {!loading && (
            <div className="upload-trust-row">
              <span><Icon name="video" size={13} /> Video stays in its original quality</span>
              <span><Icon name="link" size={13} /> One share link for the whole project</span>
            </div>
          )}

          <div className="upload-actions">
            <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button className="btn-primary" onClick={handleUpload} disabled={loading || loadingProjects || !file}>
              {loading ? 'Uploading…' : <>Upload & create review <Icon name="arrowRight" size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
