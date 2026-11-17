import { useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Icon } from './Icon'
import { notify } from '../lib/notify'
import { deleteAccount, reauthenticateForSensitiveAction } from '../lib/accountApi'

function initialsFor(user) {
  if (user?.displayName) return user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
  return user?.email?.[0]?.toUpperCase() || '?'
}

export function Profile({ user }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [reauthenticating, setReauthenticating] = useState(false)
  const memberLabel = useMemo(() => {
    if (user?.metadata?.creationTime) return new Date(user.metadata.creationTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    return 'Recently'
  }, [user])

  const handleClearReviewerSessions = () => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('arena:reviewer:'))
      keys.forEach((key) => localStorage.removeItem(key))
      const cleared = keys.length
      notify(cleared ? `Cleared ${cleared} saved reviewer session${cleared === 1 ? '' : 's'}.` : 'No saved reviewer sessions were found.', 'success')
    } catch {
      notify('Your browser did not allow Arena to clear local preferences.', 'error')
    }
  }

  const closeDeleteDialog = () => {
    if (deleting) return
    setDeleteDialogOpen(false)
    setDeletePhrase('')
  }

  const handleDeleteAccount = async () => {
    if (deletePhrase !== 'DELETE MY ACCOUNT') {
      notify('Type DELETE MY ACCOUNT exactly to confirm.', 'error')
      return
    }
    setDeleting(true)
    setReauthenticating(true)
    try {
      await reauthenticateForSensitiveAction()
      setReauthenticating(false)
      await deleteAccount(deletePhrase)
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('arena:'))
          .forEach((key) => localStorage.removeItem(key))
      } catch { /* best effort */ }
      await signOut(auth).catch(() => {})
      window.location.href = '/'
    } catch (error) {
      setReauthenticating(false)
      console.error(error)
      notify(error?.message || 'Could not delete your Arena account.', 'error')
      setDeleting(false)
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-shell profile-shell-v15">
        <div className="workspace-page-heading">
          <div><div className="eyebrow">ACCOUNT</div><h1>Profile</h1><p>Your identity in Arena, kept separate from workspace settings.</p></div>
        </div>

        <section className="profile-card-v15">
          <div className="profile-v15-hero">
            <div className="profile-avatar-large-v15">
              <span>{initialsFor(user)}</span>
              {user?.photoURL ? <img src={user.photoURL} alt="Google profile" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}
            </div>
            <div><div className="eyebrow">GOOGLE ACCOUNT</div><h2>{user?.displayName || 'Arena creator'}</h2><p>{user?.email || 'No email available'}</p></div>
          </div>
          <div className="profile-v15-details">
            <div><span>Email</span><strong>{user?.email || '—'}</strong></div>
            <div><span>Signed in with</span><strong>Google</strong></div>
            <div><span>Member since</span><strong>{memberLabel}</strong></div>
          </div>
        </section>

        <section className="profile-card-v15">
          <div className="eyebrow">LOCAL DATA</div><h2>Reviewer sessions</h2><p className="profile-subtitle">Arena can remember reviewer names on this device for review links you have opened. Review passwords are held in a secure session cookie, not in local storage.</p>
          <button type="button" className="btn-secondary compact" onClick={handleClearReviewerSessions}><Icon name="x" size={14} /> Clear reviewer sessions</button>
        </section>

        <section className="profile-card-v15 profile-account-actions">
          <div><div className="eyebrow">ACCOUNT CONTROL</div><h2>Manage your account</h2><p className="profile-subtitle">Sign out from the account menu above or permanently delete your Arena account and its projects.</p></div>
          <div className="profile-account-action-buttons"><button type="button" className="row-action danger" onClick={() => setDeleteDialogOpen(true)}><Icon name="trash" size={14} /> Delete account</button></div>
        </section>
      </div>

      {deleteDialogOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) closeDeleteDialog() }}>
          <section className="share-modal account-delete-modal" role="dialog" aria-modal="true" aria-labelledby="account-delete-title">
            <div className="share-modal-top"><div><div className="eyebrow">PERMANENT ACTION</div><h2 id="account-delete-title">Delete your Arena account?</h2></div><button type="button" className="icon-button" onClick={closeDeleteDialog} disabled={deleting} aria-label="Close dialog"><Icon name="x" size={16} /></button></div>
            <p className="share-modal-copy">This permanently removes your Arena projects, uploaded videos, feedback and review links, then deletes your Arena sign-in account.</p>
            <div className="account-delete-warning"><Icon name="trash" size={15} /><span>This cannot be undone. Do not continue unless you are sure you want to remove the entire workspace.</span></div>
            <label className="settings-field account-delete-confirm-field"><span>Type DELETE MY ACCOUNT to confirm</span><input type="text" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" spellCheck="false" placeholder="DELETE MY ACCOUNT" disabled={deleting} /></label>
            <div className="share-modal-actions"><button type="button" className="btn-secondary" onClick={closeDeleteDialog} disabled={deleting}>Keep account</button><button type="button" className="btn-danger-primary" onClick={handleDeleteAccount} disabled={deleting || deletePhrase !== 'DELETE MY ACCOUNT'}>{deleting ? (reauthenticating ? 'Confirming with Google…' : 'Deleting account…') : 'Delete permanently'}</button></div>
            <div className="share-modal-notice"><Icon name="lock" size={14} /><span>Arena deletes workspace data before the sign-in account. Google reauthentication is required immediately before deletion. Arena removes workspace data before the sign-in account so a failed cleanup can be retried safely.</span></div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
