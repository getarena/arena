import { Icon } from './Icon'

export function ErrorState({ eyebrow = 'SOMETHING WENT WRONG', title = 'We could not load this.', message, onRetry, onHome }) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state-mark"><Icon name="x" size={19} /></div>
      <div className="error-state-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h3>{title}</h3>
        <p>{message || 'Please try again. If the problem continues, return to your workspace and reopen it.'}</p>
      </div>
      <div className="error-state-actions">
        {onRetry ? <button type="button" className="btn-secondary compact" onClick={onRetry}>Try again</button> : null}
        {onHome ? <button type="button" className="btn-primary" onClick={onHome}>Back to Arena <Icon name="arrowRight" size={14} /></button> : null}
      </div>
    </div>
  )
}
