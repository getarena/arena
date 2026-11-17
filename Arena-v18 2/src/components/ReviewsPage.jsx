import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProjectCurrentStatus, getProjectVideos, getUserProjects } from '../lib/firestore'
import { Icon } from './Icon'
import { ErrorState } from './ErrorState'

const STATUS = {
  pending: { label: 'Awaiting review', cls: 'pending' },
  changes_requested: { label: 'Changes requested', cls: 'changes' },
  approved: { label: 'Approved', cls: 'approved' },
}

function relative(value) {
  const stamp = value?.toMillis?.() || (value ? new Date(value).getTime() : 0)
  if (!stamp) return 'Recently'
  const diff = Math.max(0, Date.now() - stamp)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ReviewsPage({ user, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [videos, setVideos] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserProjects(user.uid)
      setProjects(data)
      const map = {}
      await Promise.all(data.map(async (project) => { try { map[project.id] = await getProjectVideos(project.id) } catch { map[project.id] = [] } }))
      setVideos(map)
    } catch (err) {
      console.error(err)
      setError('We could not load your reviews right now.')
    } finally { setLoading(false) }
  }, [user.uid])

  useEffect(() => { queueMicrotask(load) }, [load])

  const rows = useMemo(() => projects.map((project) => {
    const projectVideos = videos[project.id] || []
    const latest = projectVideos[projectVideos.length - 1]
    const status = getProjectCurrentStatus(project, projectVideos)
    return { project, latest, versions: projectVideos.length, status, updatedAt: latest?.statusUpdatedAt || latest?.createdAt || project.createdAt }
  }).filter((row) => filter === 'all' || row.status === filter).sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)), [projects, videos, filter])

  const counts = useMemo(() => ({ all: projects.length, pending: projects.filter((p) => getProjectCurrentStatus(p, videos[p.id] || []) === 'pending').length, changes_requested: projects.filter((p) => getProjectCurrentStatus(p, videos[p.id] || []) === 'changes_requested').length, approved: projects.filter((p) => getProjectCurrentStatus(p, videos[p.id] || []) === 'approved').length }), [projects, videos])

  if (loading) return <main className="reviews-page"><div className="reviews-shell"><div className="eyebrow">WORKSPACE</div><div className="reviews-title-skeleton" /><div className="reviews-tabs-skeleton" /><div className="reviews-list-skeleton">{[0,1,2].map((item) => <span key={item} />)}</div></div></main>
  if (error) return <main className="reviews-page"><div className="reviews-shell"><ErrorState eyebrow="REVIEWS" title="Reviews could not load." message={error} onRetry={load} /></div></main>

  return (
    <main className="reviews-page">
      <div className="reviews-shell">
        <div className="workspace-page-heading"><div><div className="eyebrow">WORKSPACE</div><h1>Reviews</h1><p>A focused view of every project that needs a client decision or already has one.</p></div><button type="button" className="btn-primary" onClick={() => onOpenProject(rows[0]?.project)} disabled={!rows[0]}><Icon name="video" size={15} /> Open latest</button></div>

        <div className="reviews-filter-bar" role="tablist" aria-label="Review status filter">
          {[["all","All"],["pending","Awaiting"],["changes_requested","Changes"],["approved","Approved"]].map(([value,label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}><span>{label}</span><b>{counts[value]}</b></button>)}
        </div>

        <section className="reviews-list-card">
          {rows.length === 0 ? <div className="workspace-empty-state"><div className="workspace-empty-icon"><Icon name="video" size={20} /></div><div><h3>{projects.length ? 'No reviews in this view.' : 'No reviews yet.'}</h3><p>{projects.length ? 'Try another status filter.' : 'Create a project and upload a cut to start your first client review.'}</p></div></div> : rows.map((row) => { const status = STATUS[row.status] || STATUS.pending; return <button type="button" className="review-list-row" key={row.project.id} onClick={() => onOpenProject(row.project)}><div className="review-row-preview"><span>{row.project.title?.slice(0,1)?.toUpperCase() || 'A'}</span></div><div className="review-row-main"><strong>{row.project.title}</strong><span>{row.latest?.title || 'No version uploaded'} · {row.versions} {row.versions === 1 ? 'version' : 'versions'}</span></div><span className={`status-badge ${status.cls}`}><i />{status.label}</span><span className="review-row-updated">{relative(row.updatedAt)}</span><Icon name="arrowRight" size={14} /></button> })}
        </section>
      </div>
    </main>
  )
}
