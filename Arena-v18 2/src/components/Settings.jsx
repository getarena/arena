import { useState } from 'react'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { notify } from '../lib/notify'

function readLocal(key, fallback) {
  const value = localStorage.getItem(key)
  return value === null ? fallback : value
}

function SettingsSection({ label, title, copy, children }) {
  return <section className="settings-card"><div className="eyebrow">{label}</div><h2>{title}</h2>{copy ? <p className="settings-copy">{copy}</p> : null}{children}</section>
}

export function SettingsPage({ user, theme, onThemeChange, reviewTheme, onReviewThemeChange, onOpenActivity }) {
  const [workspaceName, setWorkspaceName] = useState(() => readLocal('arena:workspaceName', 'Arena workspace'))
  const [reviewerMemory, setReviewerMemory] = useState(() => readLocal('arena:reviewerMemory', 'on') !== 'off')
  const [saved, setSaved] = useState(false)
  const save = () => {
    const safeName = workspaceName.trim().replace(/\s+/g, ' ').slice(0, 60) || 'Arena workspace'
    setWorkspaceName(safeName)
    localStorage.setItem('arena:workspaceName', safeName)
    localStorage.setItem('arena:reviewerMemory', reviewerMemory ? 'on' : 'off')
    setSaved(true)
    notify('Settings saved on this device.', 'success')
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <main className="settings-page">
      <div className="settings-shell">
        <div className="workspace-page-heading">
          <div><div className="eyebrow">WORKSPACE</div><h1>Settings</h1><p>Shape how Arena looks and how your review rooms behave.</p></div>
          <div className="settings-heading-mark"><div className="workspace-avatar large"><span>{user?.displayName?.[0]?.toUpperCase() || 'A'}</span>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : null}</div></div>
        </div>

        <div className="settings-layout">
          <div className="settings-stack">
            <div id="workspace" />
            <SettingsSection label="01 / WORKSPACE" title="Make this workspace yours." copy="This name appears in Arena navigation and workspace surfaces on this device.">
              <label className="settings-field"><span>Workspace name</span><input value={workspaceName} maxLength={60} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Arena workspace" /></label>
              <div className="settings-identity-preview">
                <div className="settings-identity-avatar"><span>{user?.displayName?.[0]?.toUpperCase() || 'A'}</span>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : null}</div>
                <div><strong>{workspaceName.trim() || 'Arena workspace'}</strong></div>
              </div>
            </SettingsSection>

            <SettingsSection label="02 / APPEARANCE" title="A visual system that stays consistent." copy="Workspace and review rooms can each use their own appearance, while keeping Arena's design language intact.">
              <div className="settings-subsection"><div><strong>Workspace appearance</strong><span>Projects, account and settings</span></div><ThemeToggle theme={theme} onChange={onThemeChange} /></div>
              <div className="settings-subsection"><div><strong>Review room appearance</strong><span>Editor review room and client room</span></div><ThemeToggle theme={reviewTheme} onChange={onReviewThemeChange} /></div>
            </SettingsSection>

            <div id="review" />
            <SettingsSection label="03 / REVIEW EXPERIENCE" title="Keep the review focused." copy="These preferences are local to this browser for now.">
              <label className="settings-toggle-row"><span><strong>Remember reviewer details</strong><small>Save client name and email for review links opened on this device.</small></span><input type="checkbox" checked={reviewerMemory} onChange={(event) => setReviewerMemory(event.target.checked)} /><i className="switch-visual" /></label>
              <div className="settings-subsection"><div><strong>Activity</strong><span>Client feedback, approvals and change requests</span></div><button type="button" className="settings-inline-link" onClick={() => onOpenActivity?.()}>Open activity <Icon name="arrowRight" size={13} /></button></div>
            </SettingsSection>

            <div id="privacy" />
            <SettingsSection label="04 / SECURITY & PRIVACY" title="Keep the trust details close." copy="Arena's current account and review model is explained in plain language on these pages.">
              <div className="settings-link-grid">
                <a href="/privacy" target="_blank" rel="noopener noreferrer"><Icon name="lock" size={15} /><span><strong>Privacy policy</strong><small>What Arena stores and why</small></span><Icon name="arrowRight" size={13} /></a>
                <a href="/terms" target="_blank" rel="noopener noreferrer"><Icon name="link" size={15} /><span><strong>Terms of service</strong><small>The rules for using Arena</small></span><Icon name="arrowRight" size={13} /></a>
                <a href="/security" target="_blank" rel="noopener noreferrer"><Icon name="spark" size={15} /><span><strong>Security</strong><small>Current architecture and limits</small></span><Icon name="arrowRight" size={13} /></a>
                <a href="/contact" target="_blank" rel="noopener noreferrer"><Icon name="message" size={15} /><span><strong>Contact support</strong><small>getarenaapp@gmail.com</small></span><Icon name="arrowRight" size={13} /></a>
              </div>
            </SettingsSection>
          </div>
        </div>

        <div className="settings-savebar"><span>{saved ? 'Saved' : 'Settings stay on this device for now.'}</span><button type="button" className="btn-primary" onClick={save}><Icon name="check" size={15} /> {saved ? 'Saved' : 'Save settings'}</button></div>
      </div>
    </main>
  )
}
