import { useCallback, useEffect, useMemo, useState } from 'react'
import { getComments, getUserProjects, getProjectCurrentStatus, getProjectVideos } from '../lib/firestore'
import { Icon } from './Icon'
import { ErrorState } from './ErrorState'

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
  return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimestamp(seconds = 0) { return `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, '0')}` }

export function ActivityPage({ user, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [projectVideos, setProjectVideos] = useState({})
  const [projectComments, setProjectComments] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserProjects(user.uid)
      setProjects(data)
      const videoMap = {}
      const commentMap = {}
      await Promise.all(data.map(async (project) => {
        try {
          const videos = await getProjectVideos(project.id)
          videoMap[project.id] = videos
          await Promise.all(videos.map(async (video) => {
            try { commentMap[video.id] = { project, video, comments: await getComments(project.id, video.id) } } catch { commentMap[video.id] = { project, video, comments: [] } }
          }))
        } catch {
          videoMap[project.id] = []
        }
      }))
      setProjectVideos(videoMap)
      setProjectComments(commentMap)
    } catch (err) {
      console.error(err)
      setError('We could not load workspace activity right now.')
    } finally { setLoading(false) }
  }, [user.uid])

  useEffect(() => { queueMicrotask(load) }, [load])

  const activity = useMemo(() => {
    const items = []
    projects.forEach((project) => {
      items.push({ id: `created-${project.id}`, type: 'created', icon: 'folder', title: `Created ${project.title}`, project, at: project.createdAt, meta: 'Project' })
      const videos = projectVideos[project.id] || []
      videos.forEach((video) => {
        items.push({ id: `uploaded-${video.id}`, type: 'upload', icon: 'upload', title: `Uploaded ${video.title || 'new version'}`, project, video, at: video.createdAt, meta: project.title })
        if (video.status === 'approved') items.push({ id: `approved-${video.id}`, type: 'approved', icon: 'checkCircle', title: `Approved ${video.title || 'a version'}`, project, video, at: video.statusUpdatedAt || video.createdAt, meta: project.title })
        if (video.status === 'changes_requested') items.push({ id: `changes-${video.id}`, type: 'changes', icon: 'message', title: `Changes requested on ${video.title || 'a version'}`, project, video, at: video.statusUpdatedAt || video.createdAt, meta: project.title })
        ;(projectComments[video.id]?.comments || []).forEach((comment) => items.push({ id: `comment-${comment.id}`, type: 'comment', icon: 'message', title: `${comment.clientName || 'Reviewer'} left feedback`, project, video, at: comment.createdAt || video.createdAt, meta: `${project.title} · ${formatTimestamp(comment.timestamp)}` }))
      })
    })
    return items.sort((a, b) => dateValue(b.at) - dateValue(a.at))
  }, [projects, projectVideos, projectComments])

  const counts = useMemo(() => ({
    total: projects.length,
    awaiting: projects.filter((project) => getProjectCurrentStatus(project, projectVideos[project.id] || []) === 'pending').length,
    changes: projects.filter((project) => getProjectCurrentStatus(project, projectVideos[project.id] || []) === 'changes_requested').length,
    approved: projects.filter((project) => getProjectCurrentStatus(project, projectVideos[project.id] || []) === 'approved').length,
  }), [projects, projectVideos])

  if (loading) return <main className="activity-page"><div className="activity-page-shell"><div className="eyebrow">WORKSPACE</div><div className="activity-loading-bar" /><div className="activity-loading-grid"><span /><span /><span /><span /></div></div></main>
  if (error) return <main className="activity-page"><div className="activity-page-shell"><ErrorState eyebrow="ACTIVITY" title="Activity could not load." message={error} onRetry={load} /></div></main>

  return (
    <main className="activity-page">
      <div className="activity-page-shell">
        <div className="workspace-page-heading">
          <div><div className="eyebrow">WORKSPACE</div><h1>Activity</h1><p>A running record of projects, versions and client decisions.</p></div>
        </div>

        <section className="activity-stat-strip">
          <div><span>Projects</span><strong>{counts.total}</strong></div>
          <div><span>Awaiting review</span><strong>{counts.awaiting}</strong></div>
          <div><span>Changes requested</span><strong>{counts.changes}</strong></div>
          <div><span>Approved</span><strong>{counts.approved}</strong></div>
        </section>

        <section className="activity-page-card">
          <div className="activity-page-card-head"><div><div className="eyebrow">RECENT</div><h2>What changed</h2></div><span>{activity.length} events</span></div>
          {activity.length === 0 ? (
            <div className="workspace-empty-state"><div className="workspace-empty-icon"><Icon name="bell" size={20} /></div><div><h3>Nothing here yet.</h3><p>Create a project or upload a cut and Arena will start building the record for you.</p></div></div>
          ) : (
            <div className="activity-page-list">
              {activity.map((item) => (
                <button type="button" className="activity-page-item" key={item.id} onClick={() => onOpenProject(item.project)}>
                  <div className={`activity-page-icon ${item.type}`}><Icon name={item.icon} size={16} /></div>
                  <div className="activity-page-copy"><strong>{item.title}</strong><span>{item.meta}</span></div>
                  <time>{formatRelative(item.at)}</time>
                  <Icon name="arrowRight" size={14} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
