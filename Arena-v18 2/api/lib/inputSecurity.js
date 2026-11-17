const MAX_DOCUMENT_ID_LENGTH = 150
const MAX_ASSET_ID_LENGTH = 128

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function hasOnlyKeys(value, allowedKeys) {
  if (!isPlainObject(value)) return false
  const allowed = new Set(allowedKeys)
  return Object.keys(value).every((key) => allowed.has(key))
}

export function isSafeDocumentId(value, maxLength = MAX_DOCUMENT_ID_LENGTH) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && /^[A-Za-z0-9_-]+$/.test(value)
}

export function isSafeCloudinaryAssetId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_ASSET_ID_LENGTH
    && /^[A-Za-z0-9_-]+$/.test(value)
}

export function hasUnsafeControlCharacters(value) {
  return typeof value === 'string' && /[\u0000-\u001F\u007F]/.test(value)
}
