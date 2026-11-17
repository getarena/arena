import { BrandMark, Icon } from './Icon'
import { PublicFooter } from './PublicFooter'

export function PublicNav({ active = '' }) {
  return (
    <nav className="public-nav" aria-label="Arena public navigation">
      <a className="public-nav-brand" href="/" aria-label="Go to Arena home"><BrandMark size={29} /><span>Arena</span></a>
      <div className="public-nav-links">
        <a href="/#problem">Why Arena</a>
        <a href="/#review-room">Review room</a>
        <a href="/#workflow">Workflow</a>
        <a className={active === 'about' ? 'active' : ''} href="/about">About</a>
      </div>
      <div className="public-nav-actions">
        <a className="btn-primary compact" href="/login">Start free <Icon name="arrowRight" size={14} /></a>
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
