import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth'
import { auth } from './firebase'


export async function reauthenticateForSensitiveAction() {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Please sign in again before continuing.')
  const isGoogleAccount = currentUser.providerData?.some((provider) => provider.providerId === 'google.com')
  if (!isGoogleAccount) throw new Error('Arena currently requires Google reauthentication for this sensitive action.')
  await reauthenticateWithPopup(currentUser, new GoogleAuthProvider())
  return currentUser
}

export async function deleteAccount(confirmPhrase) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Please sign in again before deleting your account.')
  const idToken = await currentUser.getIdToken(true)
  const response = await fetch('/api/account-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ confirmation: confirmPhrase }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      data?.code === 'recent_auth_required'
        ? 'For your security, please confirm your Google account again before deleting your Arena account.'
        : data?.code === 'rate_limited'
          ? 'Too many deletion attempts. Please wait and try again.'
          : 'Could not delete the Arena account.'
    )
    error.status = response.status
    error.code = typeof data?.code === 'string' ? data.code : undefined
    error.dataCleanupCompleted = Boolean(data?.dataCleanupCompleted)
    error.requiresRecentAuth = Boolean(data?.requiresRecentAuth)
    throw error
  }
  return data
}
