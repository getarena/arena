import { BrandMark } from './Icon'

export function Skeleton({ className = '', ...props }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" {...props} />
}

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="v15-workspace-loading" aria-label="Loading Arena" aria-busy="true">
      <aside className="v15-loading-sidebar">
        <div className="v15-loading-brand"><BrandMark size={30} /><Skeleton className="v15-loading-word" /></div>
        <Skeleton className="v15-loading-nav-label" />
        {[0,1,2].map((item) => <Skeleton key={item} className="v15-loading-nav-item" />)}
        <Skeleton className="v15-loading-nav-label short" />
        {[0,1].map((item) => <Skeleton key={item} className="v15-loading-nav-item" />)}
        <Skeleton className="v15-loading-nav-label shorter" />
        {[0,1].map((item) => <Skeleton key={item} className="v15-loading-nav-item" />)}
        <div className="v15-loading-account"><Skeleton className="v15-loading-avatar" /><Skeleton className="v15-loading-account-copy" /></div>
      </aside>
      <div className="v15-loading-main">
        <div className="v15-loading-topbar"><Skeleton className="v15-loading-breadcrumb" /><div><Skeleton className="v15-loading-circle" /><Skeleton className="v15-loading-avatar-sm" /></div></div>
        <main className="v15-loading-content">
          <div className="v15-loading-heading"><div><Skeleton className="sk-eyebrow" /><Skeleton className="v15-loading-title" /><Skeleton className="sk-copy sk-copy-wide" /></div><Skeleton className="v15-loading-cta" /></div>
          <div className="v15-loading-stats">{[0,1,2,3].map((item) => <div key={item}><Skeleton className="v15-loading-stat-label" /><Skeleton className="v15-loading-stat-value" /><Skeleton className="v15-loading-stat-copy" /></div>)}</div>
          <div className="v15-loading-section-title"><Skeleton className="sk-eyebrow" /><Skeleton className="v15-loading-subtitle" /></div>
          <div className="v15-loading-toolbar"><Skeleton className="v15-loading-search" /><div><Skeleton /><Skeleton /><Skeleton /></div></div>
          <div className="v15-loading-cards">{[0,1].map((item) => <div className="v15-loading-card" key={item}><Skeleton className="v15-loading-card-visual" /><div><Skeleton className="v15-loading-card-title" /><Skeleton className="v15-loading-card-copy" /><Skeleton className="v15-loading-card-meta" /></div></div>)}</div>
        </main>
      </div>
    </div>
  )
}

export function ProjectHubLoadingSkeleton() {
  return (
    <main className="project-hub-page project-hub-loading-surface" aria-label="Loading project" aria-busy="true">
      <div className="project-hub-shell">
        <Skeleton className="sk-back-link" />
        <div className="loading-skeleton-project-head">
          <div><Skeleton className="sk-eyebrow" /><Skeleton className="sk-project-heading" /><Skeleton className="sk-copy sk-copy-wide" /><Skeleton className="sk-copy sk-copy-mid" /></div>
          <div className="sk-button-row"><Skeleton className="sk-button-lg" /><Skeleton className="sk-button-lg" /></div>
        </div>
        <div className="loading-skeleton-summary"><div><Skeleton className="sk-summary-label" /><Skeleton className="sk-summary-value" /></div><div><Skeleton className="sk-summary-label" /><Skeleton className="sk-summary-value sk-summary-date" /></div><div><Skeleton className="sk-summary-label" /><Skeleton className="sk-summary-value sk-summary-status" /></div></div>
        <div className="loading-skeleton-section-head"><div><Skeleton className="sk-eyebrow" /><Skeleton className="sk-title sk-title-sm" /></div><Skeleton className="sk-count" /></div>
        <div className="project-hub-grid loading-skeleton-version-grid">
          {[0, 1, 2].map((item) => <div className="loading-skeleton-version-card" key={item}><Skeleton className="sk-version-visual" /><div className="sk-version-body"><div className="sk-project-head"><div><Skeleton className="sk-kicker" /><Skeleton className="sk-card-title" /></div><Skeleton className="sk-pill" /></div><div className="sk-project-meta"><Skeleton className="sk-meta-short" /><Skeleton className="sk-meta-long" /></div><div className="sk-project-actions"><Skeleton className="sk-action-primary" /><Skeleton className="sk-action" /></div></div></div>)}
        </div>
      </div>
    </main>
  )
}

export function ReviewLoadingSkeleton({ theme = 'dark' }) {
  return (
    <div className={`loading-skeleton-review review-theme-${theme}`} aria-label="Loading review room" aria-busy="true">
      <div className="loading-skeleton-review-topbar"><Skeleton className="sk-back-link sk-dark" /><Skeleton className="sk-breadcrumb" /><div className="sk-review-tools"><Skeleton className="sk-review-button" /><Skeleton className="sk-review-button" /></div></div>
      <div className="loading-skeleton-review-workspace">
        <section>
          <div className="loading-skeleton-review-head"><div><Skeleton className="sk-eyebrow sk-dark" /><Skeleton className="sk-review-title" /><Skeleton className="sk-copy sk-copy-mid sk-dark" /></div><Skeleton className="sk-review-meta" /></div>
          <div className="sk-version-strip"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
          <Skeleton className="sk-video-stage" />
          <div className="sk-timeline"><div><Skeleton className="sk-timeline-label" /><Skeleton className="sk-timeline-time" /></div><Skeleton className="sk-timeline-track" /></div>
        </section>
        <aside className="sk-review-sidebar"><div className="sk-sidebar-head"><div><Skeleton className="sk-eyebrow sk-dark" /><Skeleton className="sk-sidebar-title" /></div><Skeleton className="sk-delete" /></div><div className="sk-comment-list">{[0, 1, 2, 3].map((item) => <div className="sk-comment" key={item}><Skeleton className="sk-comment-line short" /><Skeleton className="sk-comment-line" /><Skeleton className="sk-comment-line medium" /></div>)}</div><Skeleton className="sk-composer" /></aside>
      </div>
    </div>
  )
}

export function ClientLoadingSkeleton({ theme = 'light' }) {
  return (
    <div className={`loading-skeleton-client theme-${theme}`} aria-label="Loading review" aria-busy="true">
      <div className="loading-skeleton-nav client"><div className="loading-skeleton-nav-brand"><BrandMark /><Skeleton className="sk-brand-word" /></div><div className="sk-client-actions"><Skeleton className="sk-client-note" /><Skeleton className="sk-client-theme" /></div></div>
      <main className="loading-skeleton-client-main">
        <div className="loading-skeleton-client-head"><div><Skeleton className="sk-eyebrow" /><Skeleton className="sk-client-title" /><Skeleton className="sk-copy sk-copy-mid" /></div><Skeleton className="sk-client-private" /></div>
        <div className="loading-skeleton-client-versions"><Skeleton className="sk-version-label" /><Skeleton /><Skeleton /><Skeleton /></div>
        <div className="loading-skeleton-client-grid"><section><Skeleton className="sk-client-video" /><div className="sk-timeline"><Skeleton className="sk-timeline-label" /><Skeleton className="sk-timeline-track" /></div></section><aside className="sk-client-sidebar"><div className="sk-sidebar-head"><div><Skeleton className="sk-eyebrow" /><Skeleton className="sk-sidebar-title" /></div><Skeleton className="sk-sidebar-time" /></div><div className="sk-comment-list">{[0, 1, 2].map((item) => <div className="sk-comment" key={item}><Skeleton className="sk-comment-line short" /><Skeleton className="sk-comment-line" /><Skeleton className="sk-comment-line medium" /></div>)}</div><Skeleton className="sk-composer" /><Skeleton className="sk-decision" /></aside></div>
      </main>
    </div>
  )
}

export function LoginLoadingSkeleton() {
  return (
    <div className="login-loading-skeleton" aria-label="Loading sign in" aria-busy="true">
      <div className="login-loading-brand"><BrandMark /><Skeleton className="sk-brand-word login-brand-word" /></div>
      <div className="login-loading-grid"><div><Skeleton className="sk-eyebrow" /><Skeleton className="sk-login-title" /><Skeleton className="sk-copy sk-copy-wide" /><Skeleton className="sk-copy sk-copy-mid" /><div className="sk-login-proof">{[0, 1, 2].map((item) => <div key={item}><Skeleton className="sk-proof-icon" /><Skeleton className="sk-proof-line" /></div>)}</div></div><div className="sk-login-card"><Skeleton className="sk-eyebrow" /><Skeleton className="sk-login-card-title" /><Skeleton className="sk-copy sk-copy-mid" /><Skeleton className="sk-login-button" /><Skeleton className="sk-login-foot" /></div></div>
    </div>
  )
}

export function AboutLoadingSkeleton() {
  return (
    <div className="about-loading-skeleton" aria-label="Loading about page" aria-busy="true">
      <div className="about-loading-nav"><div className="loading-skeleton-nav-brand"><BrandMark /><Skeleton className="sk-brand-word" /></div><Skeleton className="sk-about-nav-items" /></div>
      <main><Skeleton className="sk-eyebrow" /><Skeleton className="sk-about-title" /><Skeleton className="sk-copy sk-copy-wide" /><Skeleton className="sk-copy sk-copy-mid" /><div className="sk-about-blocks">{[0, 1, 2].map((item) => <div key={item}><Skeleton className="sk-about-block-title" /><Skeleton className="sk-copy" /><Skeleton className="sk-copy" /></div>)}</div></main>
    </div>
  )
}
