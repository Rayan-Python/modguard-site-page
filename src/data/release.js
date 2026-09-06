/**
 * Single source of truth for the shipped release.
 *
 * APP_VERSION must match the `version` field in the desktop app's package.json
 * (@modguard/desktop). That value is load-bearing: electron-updater compares it
 * against the feed in app-update.yml to decide whether a running copy is out of
 * date, so it is the one version number that cannot be chosen freely. Everything
 * else on this site follows it.
 *
 * The GitHub release tag is `v${APP_VERSION}` and the DMG asset is named
 * `ModGuard-${APP_VERSION}-universal.dmg` — both are derived below rather than
 * written out by hand, so a release bump is a one-line change here.
 */

export const APP_VERSION = '1.32.0'

export const RELEASE_TAG = `v${APP_VERSION}`

export const DMG_FILENAME = `ModGuard-${APP_VERSION}-universal.dmg`

export const GITHUB_REPO = 'Rayan-Python/modguard-site-page'

export const DMG_URL = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${DMG_FILENAME}`
