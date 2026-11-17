import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { BrandMark, Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { notify } from '../lib/notify'


function initialsForUser(user) {
  return user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'
}

function Avatar({ user, large = false }) {
  const initials = initialsForUser(user)
  return (
    <div className={`nav-avatar ${large ? 'large' : ''}`}>
      <span>{initials}</span>
      {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}
    </div>
  )
}
export function Navbar({ user, isClientView = false, theme = 'light', onThemeChange, onAccount, onBrandClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      notify('Signed out of Arena.', 'success')
    } catch (e) {
      console.error(e)
      notify('Could not sign out.', 'error')
    }
  }

  const handleClientTheme = () => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')
  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick()
      return
    }
    if (isClientView) window.location.href = '/'
  }

  return (
    <nav className={`navbar ${isClientView ? 'navbar-client' : ''}`}>
      <div className="nav-container">
        <button type="button" className="nav-brand nav-brand-button" onClick={handleBrandClick} aria-label="Go to Arena home">
          <BrandMark />
          <span>Arena</span>
        </button>

        {!isClientView && user ? (
          <div className="nav-right">
            <div className="nav-user-menu" ref={menuRef}>
              <button type="button" className={`nav-user-trigger avatar-only ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Open account menu">
                <Avatar user={user} />
              </button>
              {menuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-profile">
                    <Avatar user={user} large />
                    <div><strong>{user.displayName || 'Arena creator'}</strong><span>{user.email}</span></div>
                  </div>
                  <div className="account-menu-divider" />
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onAccount?.() }}><Icon name="user" size={15} /><span>Account</span></button>
                  <div className="account-menu-theme"><div><Icon name="spark" size={14} /><span>Theme</span></div><ThemeToggle theme={theme} onChange={onThemeChange} compact /></div>
                  <div className="account-menu-divider" />
                  <button type="button" role="menuitem" className="menu-danger" onClick={handleLogout}><Icon name="logout" size={15} /><span>Sign out</span></button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="client-nav-actions">
            <div className="client-nav-note"><Icon name="lock" size={15} /><span>Private review</span></div>
            <button type="button" className="client-theme-button" onClick={handleClientTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
          </div>
        )}
      </div>
    </nav>
  )
}
