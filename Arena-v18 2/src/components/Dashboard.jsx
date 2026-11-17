import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUserProjects, getProjectVideos, getProjectCurrentStatus } from '../lib/firestore'
import { deleteProject } from '../lib/projectApi'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { WorkspaceLoadingSkeleton } from './Skeleton'
import { ErrorState } from './ErrorState'
import { friendlyError } from '../lib/uiErrors'
import { ShareLinkModal } from './ShareLinkModal'
import { ConfirmDialog } from './ConfirmDialog'

const STATUS_STYLES = {
  pending: { label: 'Awaiting review', cls: 'pending' },
  approved: { label: 'Approved', cls: 'approved' },
  changes_requested: { label: 'Changes requested', cls: 'changes' },
}

function formatDate(value) {
  try {
    if (!value) return '—'
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

function dateValue(value) { return value?.toMillis?.() || (value ? new Date(value).getTime() : 0) }
function formatRelative(value) {
  const stamp = dateValue(value)
  if (!stamp) return 'Recently'
  const diff = Math.max(0, Date.now() - stamp)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

function ProjectVisual({ project, video }) {
  return (
    <div className="project-visual">
      <div className="project-visual-grid" />
      {video?.videoUrl ? <video src={video.videoUrl} muted playsInline preload="metadata" className="project-visual-video" aria-hidden="true" /> : null}
      <div className="project-visual-overlay" />
      <div className="project-visual-topline"><span>Latest cut</span><span>{project.title}</span></div>
      <div className="project-visual-play"><Icon name="play" size={15} strokeWidth={2} /></div>
      <div className="project-filmstrip" aria-hidden="true">{[0, 1, 2, 3, 4].map((item) => <span key={item} />)}</div>
    </div>
  )
}

export function Dashboard({ user, onSelectProject, onManageProject, onUpload, onOpenActivity }) {
  const [projects, setProjects] = useState([])
  const [projectVideos, setProjectVideos] = useState({})
  const [loading, setLoading] = useState(true)
  const [shareProject, setShareProject] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadError, setLoadError] = useState(null)
  const [setupDismissed, setSetupDismissed] = useState(() => localStorage.getItem('arena:setupDismissed') === '1' || localStorage.getItem('arena:onboardingDismissed') === '1')
  const [setupForceOpen, setSetupForceOpen] = useState(false)
  const [projectView, setProjectView] = useState(() => localStorage.getItem('arena:projectView') === 'list' ? 'list' : 'grid')
  const [deleteProjectId, setDeleteProjectId] = useState(null)
  const [deletingProject, setDeletingProject] = useState(false)
  const searchRef = useRef(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      setLoadError(null)
      const data = await getUserProjects(user.uid)
      const ordered = [...data].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))
      setProjects(ordered)
      const map = {}
      await Promise.all(ordered.map(async (project) => {
        try { map[project.id] = await getProjectVideos(project.id) } catch (error) { console.error(error); map[project.id] = [] }
      }))
      setProjectVideos(map)
    } catch (error) {
      console.error(error)
      setLoadError(friendlyError(error, 'We could not load your projects right now.'))
    } finally { setLoading(false) }
  }, [user.uid])

  useEffect(() => { queueMicrotask(loadProjects) }, [loadProjects])
  useEffect(() => { localStorage.setItem('arena:projectView', projectView) }, [projectView])

  useEffect(() => {
    const shortcut = (event) => {
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable) return
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); onUpload() }
      if (event.key === 'Escape') { setQuery(''); setStatusFilter('all'); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [onUpload])

  const projectStatus = useCallback((project) => getProjectCurrentStatus(project, projectVideos[project.id] || []), [projectVideos])
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return projects.filter((project) => (!normalized || project.title?.toLowerCase().includes(normalized)) && (statusFilter === 'all' || projectStatus(project) === statusFilter))
  }, [projects, query, statusFilter, projectStatus])

  const stats = useMemo(() => ({
    projects: projects.length,
    versions: Object.values(projectVideos).reduce((sum, videos) => sum + videos.length, 0),
    awaiting: projects.filter((project) => projectStatus(project) === 'pending').length,
    changes: projects.filter((project) => projectStatus(project) === 'changes_requested').length,
    approved: projects.filter((project) => projectStatus(project) === 'approved').length,
  }), [projects, projectVideos, projectStatus])

  const attentionProjects = projects.filter((project) => ['pending', 'changes_requested'].includes(projectStatus(project)))

  const activity = useMemo(() => {
    const items = []
    projects.forEach((project) => {
      items.push({ id: `project-${project.id}`, date: project.createdAt, icon: 'folder', title: `Created ${project.title}`, meta: 'Project created', project })
      ;(projectVideos[project.id] || []).forEach((video) => {
        items.push({ id: `video-${video.id}`, date: video.createdAt, icon: 'upload', title: `Uploaded ${video.title || 'new version'}`, meta: `${project.title}`, project })
        if (video.status === 'approved') items.push({ id: `approved-${video.id}`, date: video.statusUpdatedAt || video.createdAt, icon: 'checkCircle', title: `Approved ${video.title || 'a version'}`, meta: `${project.title}`, project })
        if (video.status === 'changes_requested') items.push({ id: `changes-${video.id}`, date: video.statusUpdatedAt || video.createdAt, icon: 'message', title: `Changes requested on ${video.title || 'a version'}`, meta: `${project.title}`, project })
      })
    })
    return items.sort((a, b) => dateValue(b.date) - dateValue(a.date)).slice(0, 5)
  }, [projects, projectVideos])

  const setupSteps = [
    { id: 'signed', label: 'Sign in to Arena', done: true, action: null },
    { id: 'project', label: 'Create your first project', done: stats.projects > 0, action: () => onUpload() },
    { id: 'version', label: 'Upload your first cut', done: stats.versions > 0, action: () => onUpload() },
    { id: 'share', label: 'Share a client review link', done: projects.some((project) => Boolean(project.shareToken)), action: stats.projects ? () => onManageProject(projects[0]) : () => onUpload() },
  ]
  const setupDone = setupSteps.filter((step) => step.done).length
  const setupComplete = setupDone === setupSteps.length
  const setupVisible = setupForceOpen || (!setupDismissed && !setupComplete)

  const confirmDeleteProject = async () => {
    if (!deleteProjectId) return
    setDeletingProject(true)
    try {
      await deleteProject(deleteProjectId)
      await loadProjects()
      notify('Project deleted.', 'success')
      setDeleteProjectId(null)
    } catch (error) {
      console.error(error)
      notify('Failed to delete the project.', 'error')
    } finally { setDeletingProject(false) }
  }

  if (loading) return <WorkspaceLoadingSkeleton />
  if (loadError) return <main className="dashboard-container"><ErrorState eyebrow="WORKSPACE" title="Your projects could not load." message={loadError} onRetry={loadProjects} /></main>

  return (
    <main className="dashboard-container dashboard-v15">
      {setupVisible ? (
        <section className="workspace-setup-card">
          <div className="workspace-setup-head">
            <div><div className="eyebrow">GET STARTED</div><h2>Set up your review workspace</h2><p>{setupDone} of {setupSteps.length} complete — finish the basics, then disappear into the work.</p></div>
            <button type="button" className="workspace-setup-dismiss" onClick={() => { localStorage.setItem('arena:setupDismissed', '1'); setSetupForceOpen(false); setSetupDismissed(true) }} aria-label="Dismiss setup">×</button>
          </div>
          <div className="workspace-setup-progress"><span style={{ width: `${(setupDone / setupSteps.length) * 100}%` }} /></div>
          <div className="workspace-setup-steps">
            {setupSteps.map((step) => <button type="button" key={step.id} className={`workspace-setup-step ${step.done ? 'done' : ''}`} onClick={step.action} disabled={step.done || !step.action}><span className="workspace-setup-step-icon">{step.done ? <Icon name="check" size={13} /> : step.id === 'share' ? <Icon name="share" size={13} /> : <span>{setupSteps.indexOf(step) + 1}</span>}</span><span><strong>{step.label}</strong><small>{step.done ? 'Complete' : step.id === 'share' && stats.projects ? 'Open your project to share' : 'Start here'}</small></span>{!step.done && step.action ? <Icon name="arrowRight" size={13} /> : null}</button>)}
          </div>
        </section>
      ) : null}

      <section className="dashboard-hero dashboard-hero-v15">
        <div className="dashboard-hero-copy"><div className="eyebrow">OVERVIEW</div><h1>Welcome back, {user?.displayName?.split(' ')?.[0] || 'creator'}</h1><p>Here is what is happening across your review workspace today.</p></div>
        <button className="btn-primary btn-primary-lg dashboard-new-review" onClick={() => onUpload()}><Icon name="plus" size={17} /> New review</button>
      </section>

      <section className="workspace-stat-strip">
        <div><span>Total projects</span><strong>{stats.projects}</strong><small>Review rooms in this workspace</small></div>
        <div><span>Versions</span><strong>{stats.versions}</strong><small>Uploaded cuts across projects</small></div>
        <div className={stats.awaiting ? 'attention' : ''}><span>Awaiting review</span><strong>{stats.awaiting}</strong><small>Need a client decision</small></div>
        <div className={stats.changes ? 'attention-red' : ''}><span>Changes requested</span><strong>{stats.changes}</strong><small>Need another pass</small></div>
      </section>

      {attentionProjects.length ? (() => {
        const project = attentionProjects[0]
        const videos = projectVideos[project.id] || []
        const latest = videos[videos.length - 1]
        const currentStatus = projectStatus(project)
        const status = STATUS_STYLES[currentStatus] || STATUS_STYLES.pending
        return <section className={`dashboard-attention dashboard-attention-v15 ${currentStatus === 'changes_requested' ? 'is-changes' : ''}`}>
          <div className="dashboard-attention-visual"><ProjectVisual project={project} video={latest} /></div>
          <div className="dashboard-attention-copy"><div className="eyebrow">NEEDS YOUR ATTENTION</div><div className="dashboard-attention-title-row"><h2>{project.title}</h2><span className={`status-badge ${status.cls}`}><i />{status.label}</span></div><p>{currentStatus === 'changes_requested' ? (latest?.statusReason || 'A client requested another pass on the current cut.') : 'The latest cut is waiting for a client decision.'}</p><div className="dashboard-attention-meta"><span>{latest?.title || 'Latest cut'}</span><i /><span>{videos.length} {videos.length === 1 ? 'version' : 'versions'}</span><i /><span>Updated {formatRelative(latest?.statusUpdatedAt || latest?.createdAt || project.createdAt)}</span></div><div className="dashboard-attention-actions"><button className="row-action primary" onClick={() => onSelectProject(project)}>Open project <Icon name="arrowRight" size={15} /></button>{project.shareToken ? <button className="row-action" onClick={() => setShareProject(project)}><Icon name="share" size={14} /> Share</button> : null}</div></div>
        </section>
      })() : null}

      <section className="project-list-section dashboard-work-section">
        <div className="section-heading-row dashboard-section-head"><div><div className="eyebrow">PROJECTS</div><h2>Your recent work</h2><p>{filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} in view</p></div></div>

        <div className="project-toolbar">
          <div className="project-toolbar-search-wrap"><label className="search-box"><Icon name="search" size={15} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a project" aria-label="Search projects" />{query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={13} /></button> : null}</label><span className="toolbar-shortcut"><kbd>/</kbd> search</span></div>
          <div className="filter-tabs" role="tablist" aria-label="Filter projects">{[['all','All'],['pending','Awaiting'],['changes_requested','Changes'],['approved','Approved']].map(([value,label]) => <button key={value} className={statusFilter === value ? 'active' : ''} onClick={() => setStatusFilter(value)} role="tab" aria-selected={statusFilter === value}><span>{label}</span><b>{value === 'all' ? projects.length : projects.filter((project) => projectStatus(project) === value).length}</b></button>)}</div>
          <div className="project-view-toggle" aria-label="Project layout"><button type="button" className={projectView === 'grid' ? 'active' : ''} onClick={() => setProjectView('grid')} aria-pressed={projectView === 'grid'}><Icon name="grid" size={14} /> Grid</button><button type="button" className={projectView === 'list' ? 'active' : ''} onClick={() => setProjectView('list')} aria-pressed={projectView === 'list'}><Icon name="menu" size={14} /> List</button></div>
        </div>

        {projects.length === 0 ? (
          <div className="workspace-empty-state dashboard-empty-v15"><div className="workspace-empty-icon"><Icon name="video" size={20} /></div><div><h3>Your first review starts here.</h3><p>Create the room, upload the cut and send the link when it is ready.</p></div><button className="btn-primary compact" onClick={() => onUpload()}><Icon name="plus" size={14} /> New review</button></div>
        ) : filteredProjects.length === 0 ? (
          <div className="workspace-empty-state dashboard-empty-v15"><div className="workspace-empty-icon"><Icon name="search" size={20} /></div><div><h3>No projects match that view.</h3><p>Try another search or clear the current filter.</p></div><button className="btn-secondary compact" onClick={() => { setQuery(''); setStatusFilter('all') }}>Clear filters</button></div>
        ) : (
          <div className={`projects-grid ${projectView === 'list' ? 'is-list' : ''}`}>{filteredProjects.map((project) => {
            const videos = projectVideos[project.id] || []
            const latest = videos[videos.length - 1]
            const currentStatus = projectStatus(project)
            const status = STATUS_STYLES[currentStatus] || STATUS_STYLES.pending
            const reason = latest?.statusReason || project.statusReason || ''
            return <article key={project.id} className="project-card" onClick={() => onSelectProject(project)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectProject(project) } }} role="button" tabIndex={0} aria-label={`Open project ${project.title}`}>
              <ProjectVisual project={project} video={latest} />
              <div className="project-card-body"><div className="project-card-title-row"><div><div className="project-row-kicker">PROJECT</div><h3>{project.title}</h3><p>{latest?.title || 'No upload yet'} · {videos.length} {videos.length === 1 ? 'version' : 'versions'}</p></div><span className={`status-badge ${status.cls}`}><i />{status.label}</span></div><div className="project-card-meta"><span><Icon name="video" size={13} /> {formatDate(project.createdAt)}</span><span>{currentStatus === 'changes_requested' && reason ? `“${reason}”` : `Updated ${formatRelative(latest?.statusUpdatedAt || latest?.createdAt || project.createdAt)}`}</span></div><div className="project-card-actions"><button className="row-action primary" onClick={(event) => { event.stopPropagation(); onSelectProject(project) }}>Open project <Icon name="arrowRight" size={15} /></button><button className="row-action" onClick={(event) => { event.stopPropagation(); setShareProject(project) }}><Icon name="share" size={14} /> Share</button><button className="row-action danger project-card-delete" onClick={(event) => { event.stopPropagation(); setDeleteProjectId(project.id) }} aria-label={`Delete project ${project.title}`} title="Delete project"><Icon name="trash" size={14} /></button></div></div>
            </article>
          })}</div>
        )}
      </section>

      <section className="dashboard-bottom-grid dashboard-bottom-grid-single">
        <div className="dashboard-bottom-card"><div className="dashboard-bottom-card-head"><div><div className="eyebrow">ACTIVITY</div><h2>Recent activity</h2></div><button type="button" onClick={onOpenActivity}>Open activity <Icon name="arrowRight" size={13} /></button></div>{activity.length ? <div className="dashboard-activity-list">{activity.map((item) => <button type="button" key={item.id} onClick={() => onManageProject(item.project)}><span className={`dashboard-activity-icon ${item.icon}`}><Icon name={item.icon} size={14} /></span><span><strong>{item.title}</strong><small>{item.meta}</small></span><time>{formatRelative(item.date)}</time></button>)}</div> : <div className="dashboard-inline-empty">No activity yet. Your first project will start the record.</div>}</div>
      </section>

      {shareProject ? <ShareLinkModal project={shareProject} onClose={() => setShareProject(null)} onProjectChange={(nextProject) => { setShareProject(nextProject); setProjects((items) => items.map((item) => item.id === nextProject.id ? nextProject : item)) }} /> : null}
      {deleteProjectId ? (() => { const target = projects.find((item) => item.id === deleteProjectId); return <ConfirmDialog title={`Delete “${target?.title || 'this project'}”?`} message="This removes the project record. This action cannot be undone." confirmLabel="Delete project" onCancel={() => setDeleteProjectId(null)} onConfirm={confirmDeleteProject} busy={deletingProject} /> })() : null}
    </main>
  )
}
