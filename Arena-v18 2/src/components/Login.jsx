import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useState } from 'react'
import { BrandMark, Icon } from './Icon'
import { notify } from '../lib/notify'

function MiniReviewPreview() {
  return (
    <div className="login-preview">
      <div className="login-preview-top"><div><BrandMark size={17} /><span>Arena</span></div><span>review / campaign</span><span className="login-preview-live"><i /> Private</span></div>
      <div className="login-preview-grid">
        <div className="login-preview-video"><div className="login-preview-slate">CURRENT CUT <strong>V3</strong></div><div className="login-preview-play"><Icon name="play" size={14} /></div><div className="login-preview-controls"><span>0:38</span><i><b /></i><span>1:42</span></div></div>
        <div className="login-preview-comments"><div className="login-preview-comments-head"><span>Feedback</span><strong>03</strong></div><div className="login-preview-note active"><b>0:14</b><span>Slow the opening down a touch.</span></div><div className="login-preview-note"><b>0:38</b><span>Bring the product shot in sooner.</span></div><div className="login-preview-note"><b>1:21</b><span>End card is ready.</span></div></div>
      </div>
    </div>
  )
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const [legalConsent, setLegalConsent] = useState(false)
  const [ageConsent, setAgeConsent] = useState(false)

  const toggleLegalConsent = (nextValue) => {
    setLegalConsent(nextValue)
  }

  const handleLogin = async () => {
    if (!legalConsent || !ageConsent) {
      notify('Please complete the Terms/Privacy and age confirmation before signing in.', 'error')
      return
    }
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      window.history.replaceState({}, '', '/')
    } catch (error) {
      console.error('Login failed:', error)
      const messages = {
        'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for Arena and try again.',
        'auth/popup-closed-by-user': 'The Google sign-in window was closed before sign-in finished.',
        'auth/unauthorized-domain': 'This Arena domain is not authorized for Google sign-in yet. Add it under Firebase Authentication → Settings → Authorized domains.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled for this Arena Firebase project yet.',
        'auth/network-request-failed': 'The sign-in request could not reach Firebase. Check your connection and try again.',
        'auth/invalid-api-key': 'Arena is not connected to the configured Firebase project. Check the Firebase Web App environment variables in Vercel.',
        'auth/internal-error': 'Google sign-in could not be completed because of a Firebase configuration error. Check the Firebase Web App settings and try again.',
        'auth/web-storage-unsupported': 'This browser cannot store the secure sign-in session required by Arena. Try a current browser with cookies/site storage enabled.',
        'auth/invalid-oauth-client-id': 'Google sign-in is connected to an invalid OAuth client. Check the Google web client configured for this Firebase project.',
        'auth/configuration-not-found': 'Firebase Authentication is not fully configured for this web app. Check the Firebase Authentication provider and Web App settings.',
        'auth/account-exists-with-different-credential': 'This Google account already exists in Arena with a different sign-in method.',
        'auth/cancelled-popup-request': 'Another Google sign-in window is already open. Finish that sign-in or close it and try again.',
        'auth/too-many-requests': 'Too many sign-in attempts were made. Wait a moment and try again.',
      }
      const fallbackMessage = error?.code
        ? `Login failed (${error.code}). Please try again.`
        : 'Login failed. Please try again.'
      notify(messages[error?.code] || fallbackMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-branding">
        <a className="login-brand" href="/"><BrandMark size={32} /><span>Arena</span></a>
        <div className="login-brand-copy"><span>PRIVATE VIDEO REVIEW</span><span>FOR EDITORS &amp; AGENCIES</span></div>
      </div>
      <div className="login-split">
        <div className="login-copy-panel">
          <div className="eyebrow">CREATOR WORKSPACE</div>
          <h1>Send the cut. Get clear feedback.</h1>
          <p>Give every client a calm review room where the video stays central, feedback stays timestamped, and the next decision is easy to act on.</p>
          <div className="login-proof-list"><div><Icon name="clock" size={16} /><span>Timestamped notes</span></div><div><Icon name="link" size={16} /><span>One private review link</span></div><div><Icon name="check" size={16} /><span>Approval or changes, clearly shown</span></div></div>
          <a className="login-back-link" href="/"><Icon name="arrowLeft" size={14} /> Back to Arena</a>
        </div>
        <div className="login-card">
          <div className="eyebrow">ARENA WORKSPACE</div>
          <h2>Welcome back.</h2>
          <p className="login-subtitle">Sign in with Google to manage projects and review rooms. Clients can review your work without creating an Arena account.</p>
          <div className="login-consent">
            <label className="login-consent-label">
              <input
                type="checkbox"
                checked={legalConsent}
                onChange={(event) => toggleLegalConsent(event.target.checked)}
              />
              <span className="login-consent-box" aria-hidden="true">{legalConsent ? '✓' : ''}</span>
              <span className="login-consent-copy">
                I agree to Arena's <a href="/terms">Terms of Service</a> and acknowledge the <a href="/privacy">Privacy Policy</a>.
              </span>
            </label>
            <label className="login-consent-label login-age-consent">
              <input
                type="checkbox"
                checked={ageConsent}
                onChange={(event) => setAgeConsent(event.target.checked)}
              />
              <span className="login-consent-box" aria-hidden="true">{ageConsent ? '✓' : ''}</span>
              <span className="login-consent-copy">I confirm that I am 13 years of age or older.</span>
            </label>
          </div>
          <button className="btn-google" onClick={handleLogin} disabled={loading || !legalConsent || !ageConsent}>
            <span className="google-dot">G</span>
            {loading ? 'Signing in…' : 'Continue with Google'}
            <Icon name="arrowRight" size={15} />
          </button>
          <div className="login-security"><Icon name="lock" size={14} /><span>Secure authentication powered by Google</span></div><a className="login-about-link" href="/about">Not sure what Arena is? Read the plain-English guide <Icon name="arrowRight" size={12} /></a>
        </div>
      </div>
      <div className="login-preview-wrap"><MiniReviewPreview /></div>
    </div>
  )
}
