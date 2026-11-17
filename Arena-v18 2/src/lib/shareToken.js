const TOKEN_BYTES = 32

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function generateShareToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('This browser cannot generate secure review links. Please update your browser.')
  }

  const bytes = new Uint8Array(TOKEN_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export function isStrongShareToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}
