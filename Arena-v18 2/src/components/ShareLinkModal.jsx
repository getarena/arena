import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { openArenaInSameTab } from '../lib/navigation'
import { buildReviewInvite, buildReviewLink, shareReviewInvite } from '../lib/shareInvite'
import { clearReviewPassword, setReviewPassword, setShareActive } from '../lib/projectApi'

function getInitials(title = '') {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'AR'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function ShareLinkModal({ project, onClose, onProjectChange }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareActive, setShareActiveState] = useState(project?.shareActive !== false)
  const [passwordEnabled, setPasswordEnabled] = useState(project?.reviewPasswordEnabled === true)
  const [password, setPassword] = useState('')
  const [savingSecurity, setSavingSecurity] = useState(false)
  const link = useMemo(() => buildReviewLink(project), [project])
  const message = useMemo(() => buildReviewInvite({ ...project, reviewPasswordEnabled: passwordEnabled }), [project, passwordEnabled])
  const initials = useMemo(() => getInitials(project?.title), [project?.title])

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !savingSecurity) onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [onClose, savingSecurity])

  const mergeProject = (patch) => onProjectChange?.({ ...project, ...patch })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(true)
      notify('Review link copied.', 'success')
      window.setTimeout(() => setCopiedLink(false), 1800)
    } catch {
      notify('Could not copy the review link.', 'error')
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopiedMessage(true)
      notify('Invitation message copied.', 'success')
      window.setTimeout(() => setCopiedMessage(false), 1800)
    } catch {
      notify('Could not copy the invitation message.', 'error')
    }
  }

  const share = async () => {
    setSharing(true)
    try {
      const result = await shareReviewInvite({ ...project, reviewPasswordEnabled: passwordEnabled })
      notify(result === 'shared' ? 'Share sheet opened.' : 'Invitation message copied.', 'success')
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Could not share the invitation.', 'error')
    } finally {
      setSharing(false)
    }
  }

  const open = () => openArenaInSameTab(link)

  const saveShareStatus = async (nextActive) => {
    if (nextActive === shareActive) return
    setSavingSecurity(true)
    try {
      await setShareActive(project.id, nextActive)
      setShareActiveState(nextActive)
      mergeProject({ shareActive: nextActive })
      notify(nextActive ? 'Review link is active again.' : 'Review link paused.', 'success')
    } catch (error) {
      console.error(error)
      notify(error?.message || 'Could not update review-link access.', 'error')
    } finally {
      setSavingSecurity(false)
    }
  }

  const enablePassword = async () => {
    if (password.length < 8) {
      notify('Use a review password with at least 8 characters.', 'error')
      return
    }
    setSavingSecurity(true)
    try {
      await setReviewPassword(project.id, password)
      setPasswordEnabled(true)
      setPassword('')
      mergeProject({ reviewPasswordEnabled: true })
      notify('Password protection is on.', 'success')
    } catch (error) {
      console.error(error)
      notify(error?.message || 'Could not protect this review.', 'error')
    } finally {
      setSavingSecurity(false)
    }
  }

  const disablePassword = async () => {
    setSavingSecurity(true)
    try {
      await clearReviewPassword(project.id)
      setPasswordEnabled(false)
      setPassword('')
      mergeProject({ reviewPasswordEnabled: false })
      notify('Password protection removed.', 'success')
    } catch (error) {
      console.error(error)
      notify(error?.message || 'Could not remove password protection.', 'error')
    } finally {
      setSavingSecurity(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingSecurity) onClose?.() }}>
      <section className="share-modal share-modal-v2 share-modal-v3" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
        <div className="share-modal-top">
          <div>
            <div className="eyebrow">SHARE REVIEW</div>
            <h2 id="share-modal-title">Invite someone to review this project.</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={savingSecurity} aria-label="Close share dialog"><Icon name="x" size={16} /></button>
        </div>

        <div className="share-invite-card">
          <div className="share-invite-card-top">
            <div className="share-project-mark" aria-hidden="true">{initials}</div>
            <div className="share-project-copy">
              <span>ARENA REVIEW</span>
              <strong>{project?.title || 'Untitled project'}</strong>
              <small>{passwordEnabled ? 'Password-protected review room · New versions stay on the same link' : 'Private review room · New versions stay on the same link'}</small>
            </div>
            <span className={`share-access-pill ${shareActive ? 'active' : 'paused'}`}><i />{shareActive ? 'Active' : 'Paused'}</span>
          </div>
          <div className="share-invite-message">You’ve been invited to review this project in Arena.</div>
          <div className="share-invite-link"><Icon name="link" size={14} /><span>{link}</span></div>
        </div>

        <div className="share-modal-section-label">SEND IT YOUR WAY</div>
        <div className="share-modal-actions share-modal-actions-grid">
          <button type="button" className="share-channel primary" onClick={share} disabled={sharing || !shareActive}>
            <span className="share-channel-icon"><Icon name="share" size={16} /></span>
            <span><strong>{sharing ? 'Opening…' : 'Share invitation'}</strong><small>Use your device’s share sheet</small></span>
            <Icon name="arrowRight" size={15} />
          </button>
          <button type="button" className="share-channel" onClick={copyMessage} disabled={!shareActive}>
            <span className="share-channel-icon"><Icon name={copiedMessage ? 'check' : 'copy'} size={16} /></span>
            <span><strong>{copiedMessage ? 'Message copied' : 'Copy invitation'}</strong><small>Paste into WhatsApp, email, Slack, or chat</small></span>
            <Icon name="arrowRight" size={15} />
          </button>
        </div>

        <div className="share-modal-link-row">
          <div className="share-link-field"><Icon name="link" size={15} /><span>{link}</span></div>
          <button type="button" className="btn-secondary share-copy-link" onClick={copy}><Icon name={copiedLink ? 'check' : 'copy'} size={15} /> {copiedLink ? 'Copied' : 'Copy link'}</button>
        </div>

        <section className="share-security-card">
          <div className="share-security-head"><div><div className="eyebrow">ACCESS CONTROL</div><h3>Keep the room under your control.</h3></div><Icon name="lock" size={17} /></div>
          <div className="share-security-row">
            <div><strong>Review link</strong><span>{shareActive ? 'Anyone with the link can enter.' : 'The link is paused and cannot be opened.'}</span></div>
            <button type="button" className={`security-toggle ${shareActive ? 'active' : ''}`} onClick={() => saveShareStatus(!shareActive)} disabled={savingSecurity} aria-pressed={shareActive}><i /><span>{shareActive ? 'Active' : 'Paused'}</span></button>
          </div>
          <div className="share-security-row password-row">
            <div><strong>Password protection</strong><span>{passwordEnabled ? 'A password is required before the review room opens.' : 'Optional extra protection for sensitive client reviews.'}</span></div>
            {passwordEnabled ? (
              <button type="button" className="btn-secondary compact" onClick={disablePassword} disabled={savingSecurity}>Remove password</button>
            ) : (
              <div className="security-password-form"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} placeholder="At least 8 characters" aria-label="Review password" disabled={savingSecurity} /><button type="button" className="btn-secondary compact" onClick={enablePassword} disabled={savingSecurity || password.length < 8}>Protect</button></div>
            )}
          </div>
        </section>

        <div className="share-modal-footer-row">
          <div className="share-modal-notice"><Icon name="lock" size={14} /><span>{passwordEnabled ? 'Keep the link and password private. The password is never included in the share message.' : 'Keep this link private. Anyone who has the link can open the current review room.'}</span></div>
          <button type="button" className="share-open-link" onClick={open} disabled={!shareActive}><Icon name="external" size={14} /> Open review</button>
        </div>
      </section>
    </div>
  )
}
