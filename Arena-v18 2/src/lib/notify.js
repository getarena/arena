export function notify(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('arena:toast', { detail: { message, type } }))
}
