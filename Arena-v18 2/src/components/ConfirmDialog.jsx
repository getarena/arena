import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

export function ConfirmDialog({
  eyebrow = 'CONFIRM ACTION',
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [onCancel, busy])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel?.() }}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="confirm-modal-icon"><Icon name="trash" size={18} /></div>
        <div className="confirm-modal-copy">
          <div className="eyebrow">{eyebrow}</div>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy} ref={cancelRef}>{cancelLabel}</button>
          <button type="button" className="btn-danger-primary" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
