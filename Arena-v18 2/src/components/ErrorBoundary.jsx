import React from 'react'
import { BrandMark, Icon } from './Icon'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Arena runtime error:', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="runtime-error-page">
        <div className="runtime-error-card">
          <div className="runtime-error-brand"><BrandMark size={30} /><span>Arena</span></div>
          <div className="runtime-error-icon"><Icon name="spark" size={20} /></div>
          <div className="eyebrow">ARENA / RECOVERY</div>
          <h1>Something went wrong.</h1>
          <p>Arena could not finish rendering this screen. Your saved project data is not changed by refreshing this page.</p>
          <div className="runtime-error-actions">
            <button type="button" className="btn-primary" onClick={this.handleReload}>Reload Arena <Icon name="arrowRight" size={14} /></button>
            <button type="button" className="btn-secondary" onClick={this.handleHome}>Back to home</button>
          </div>
          <div className="runtime-error-note"><Icon name="message" size={13} /> Need help? Email getarenaapp@gmail.com.</div>
        </div>
      </div>
    )
  }
}
