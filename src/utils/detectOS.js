// Best-effort OS detection from the browser. Falls back to 'mac' when the
// platform can't be determined or doesn't clearly match a known OS.
export function detectOS() {
  if (typeof navigator === 'undefined') return 'mac'

  const ua = (navigator.userAgent || '').toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  const combined = `${ua} ${platform}`

  if (combined.includes('win')) return 'windows'
  if (combined.includes('mac')) return 'mac'

  return 'mac'
}
