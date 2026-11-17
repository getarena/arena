import { Icon } from './Icon'

export function NotFound({ onHome }) {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <div className="eyebrow">NOT FOUND</div>
        <h1>That page isn't in the review room.</h1>
        <p>The link may have moved, expired, or never existed.</p>
        <div className="not-found-actions"><button className="btn-primary" onClick={onHome}>Back to Arena <Icon name="arrowRight" size={15} /></button><a className="btn-secondary compact not-found-help-link" href="/help" target="_blank" rel="noopener noreferrer">Help</a></div>
      </div>
    </main>
  )
}
