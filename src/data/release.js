/**
 * Single source of truth for the shipped release.
 *
 * APP_VERSION must match the `version` field in the desktop app's package.json
 * (@modguard/desktop). That value is load-bearing: electron-updater compares it
 * against the feed in app-update.yml to decide whether a running copy is out of
 * date, so it is the one version number that cannot be chosen freely. Everything
 * else on this site follows it.
 *
 * RELEASE_TAG is NOT derived from APP_VERSION. It once was (`v${APP_VERSION}`),
 * which silently pointed the download button at a GitHub release tag
 * (v1.32.0) that doesn't exist — GitHub 404s that instead of serving the file,
 * so "Download for Mac" landed on a GitHub page rather than downloading
 * anything. Published tags have not tracked the app version since (v4.0.0 was
 * "V4.0.0" against app version 1.32.0; this release is "v5.0.0" against app
 * version 1.41.0), so the tag is set by hand here and must be updated by hand
 * on every release; only the DMG filename still follows APP_VERSION.
 */

export const APP_VERSION = '1.41.0'

// What the changelog shows as this release's version — the app version, not
// the GitHub tag, so it reads as v1.41.0 above changes written for v1.41.0 and
// above the older entries beneath it.
export const RELEASE_VERSION_LABEL = `v${APP_VERSION}`

// The literal GitHub release tag, only for building the download URL. It does
// not follow APP_VERSION — see the note above.
export const RELEASE_TAG = 'v5.0.0'

export const DMG_FILENAME = `ModGuard-${APP_VERSION}-universal.dmg`

export const GITHUB_REPO = 'Rayan-Python/modguard-site-page'

export const DMG_URL = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${DMG_FILENAME}`
