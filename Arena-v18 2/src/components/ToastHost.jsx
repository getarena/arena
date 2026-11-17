import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (event) => {
      const id = `${Date.now()}-${Math.random()}`
      const toast = { id, ...event.detail }
      setToasts((items) => [...items, toast])
      window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== id))
      }, 2600)
    }

    window.addEventListener('arena:toast', handleToast)
    return () => window.removeEventListener('arena:toast', handleToast)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-overlay" aria-live="polite" aria-atomic="true">
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`} role="status">
            <div className="toast-icon">
              <Icon name={toast.type === 'error' ? 'x' : toast.type === 'success' ? 'check' : 'spark'} size={16} />
            </div>
            <div className="toast-copy">
              <strong>{toast.type === 'error' ? 'Something went wrong' : toast.type === 'success' ? 'Done' : 'Arena'}</strong>
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
