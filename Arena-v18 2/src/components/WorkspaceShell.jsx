import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { BrandMark, Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { notify } from '../lib/notify'
import { APP_PATHS, pushArenaPath } from '../lib/navigation'

const navGroups = [
  { label: 'WORKSPACE', items: [
    { id: 'dashboard', label: 'Projects', icon: 'folder' },
    { id: 'reviews', label: 'Reviews', icon: 'video' },
    { id: 'activity', label: 'Activity', icon: 'bell' },
  ] },
  { label: 'ACCOUNT', items: [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'settings', label: 'Settings', icon: 'spark' },
  ] },
]


function initialsFor(user) {
  if (user?.displayName) return user.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return user?.email?.[0]?.toUpperCase() || '?'
}

export function WorkspaceShell({ user, activeView, onNavigate, theme, onThemeChange, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const workspaceName = localStorage.getItem('arena:workspaceName')?.trim() || 'Arena workspace'

  useEffect(() => {
    const onPointer = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  const navigate = (view) => {
    setMobileOpen(false)
    setAccountOpen(false)
    onNavigate(view)
  }

  const navPath = (view) => APP_PATHS[view] || APP_PATHS.dashboard

  const handleNavLink = (event, view) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(view)
  }

  const logout = async () => {
    try {
      await signOut(auth)
      window.location.replace('/')
    } catch (error) {
      console.error(error)
      notify('Could not sign out.', 'error')
    }
  }

  return (
    <div className="workspace-shell">
      <button
        type="button"
        className={`workspace-mobile-scrim ${mobileOpen ? 'is-open' : ''}`}
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`workspace-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Arena workspace navigation">
        <div className="workspace-sidebar-brand">
          <a href={APP_PATHS.dashboard} className="workspace-brand-button" onClick={(event) => handleNavLink(event, 'dashboard')} aria-label="Open Projects">
            <BrandMark size={30} />
            <span>Arena</span>
          </a>
          <button type="button" className="workspace-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="workspace-sidebar-scroll">
          {navGroups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <div className="workspace-nav-label">{group.label}</div>
              <div className="workspace-nav-items">
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={navPath(item.id)}
                    className={`workspace-nav-item ${((item.id === 'dashboard' && ['dashboard', 'project', 'upload'].includes(activeView)) || activeView === item.id) ? 'active' : ''}`}
                    onClick={(event) => handleNavLink(event, item.id)}
                    aria-current={((item.id === 'dashboard' && ['dashboard', 'project', 'upload'].includes(activeView)) || activeView === item.id) ? 'page' : undefined}
                  >
                    <Icon name={item.icon} size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}

        </div>

        <div className="workspace-sidebar-bottom" ref={accountRef}>
          <button
            type="button"
            className={`workspace-account-card ${accountOpen ? 'open' : ''}`}
            onClick={() => setAccountOpen((value) => !value)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
          >
            <div className="workspace-avatar">
              <span>{initialsFor(user)}</span>
              {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}
            </div>
            <div className="workspace-account-copy">
              <strong>{workspaceName}</strong>
              <span>{user?.displayName || 'Personal workspace'}</span>
            </div>
            <Icon name="chevronDown" size={14} />
          </button>
          {accountOpen ? (
            <div className="workspace-account-popover workspace-account-popover-bottom" role="menu">
              <div className="workspace-account-popover-head">
                <div className="workspace-topbar-avatar large"><span>{initialsFor(user)}</span>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : null}</div>
                <div><strong>{user?.displayName || 'Arena creator'}</strong><span>{user?.email || ''}</span></div>
              </div>
              <div className="workspace-account-popover-line" />
              <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); navigate('profile') }}><Icon name="user" size={15} /><span>Profile</span></button>
              <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); navigate('settings') }}><Icon name="spark" size={15} /><span>Settings</span></button>
              <div className="workspace-account-theme"><div><Icon name="sun" size={14} /><span>Appearance</span></div><ThemeToggle theme={theme} onChange={onThemeChange} compact /></div>
              <div className="workspace-account-popover-line" />
              <button type="button" role="menuitem" className="workspace-account-danger" onClick={logout}><Icon name="logout" size={15} /><span>Sign out</span></button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button type="button" className="workspace-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Icon name="menu" size={19} /></button>
          </div>
          <div className="workspace-topbar-right">
            <button type="button" className={`workspace-topbar-activity ${activeView === 'activity' ? 'active' : ''}`} onClick={() => navigate('activity')} aria-label="Open activity" title="Activity">
              <Icon name="bell" size={17} />
            </button>
          </div>
        </header>
        <div className="workspace-content">{children}</div>
      </div>
    </div>
  )
}
