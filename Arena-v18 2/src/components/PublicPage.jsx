import { BrandMark, Icon } from './Icon'
import { PublicFooter } from './PublicFooter'

function go(path) { window.location.href = path }

export function PublicNav({ active = '' }) {
  return (
    <nav className="public-nav" aria-label="Arena public navigation">
      <button type="button" className="public-nav-brand" onClick={() => go('/')} aria-label="Go to Arena home"><BrandMark size={29} /><span>Arena</span></button>
      <div className="public-nav-links">
        <button type="button" onClick={() => go('/#problem')}>Why Arena</button>
        <button type="button" onClick={() => go('/#review-room')}>Review room</button>
        <button type="button" onClick={() => go('/#workflow')}>Workflow</button>
        <a className={active === 'about' ? 'active' : ''} href="/about" target="_blank" rel="noopener noreferrer">About</a>
      </div>
      <div className="public-nav-actions">
        <button type="button" className="btn-primary compact" onClick={() => go('/login')}>Start free <Icon name="arrowRight" size={14} /></button>
      </div>
    </nav>
  )
}

export function PublicPage({ eyebrow, title, lede, active, children }) {
  return (
    <div className="public-page">
      <PublicNav active={active} />
      <main className="public-page-main">
        <header className="public-page-hero"><div className="public-page-kicker">ARENA / {eyebrow}</div><h1>{title}</h1>{lede ? <p>{lede}</p> : null}</header>
        <div className="public-page-content">{children}</div>
      </main>
      <PublicFooter />
    </div>
  )
}

export function PublicSection({ label, title, children }) {
  return <section className="public-section">{label ? <div className="public-section-label">{label}</div> : null}{title ? <h2>{title}</h2> : null}<div className="public-section-body">{children}</div></section>
}
