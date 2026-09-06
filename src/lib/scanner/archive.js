/**
 * Reading the archive itself: entries, the structural facts that only the raw
 * zip can tell you, and whether a signature still covers what is inside.
 *
 * fflate unpacks the entries; the central directory is read separately because
 * an entry map cannot show you a name that appears twice, or bytes parked after
 * the point every zip reader stops at.
 */

import { unzipSync } from 'fflate'

const utf8 = new TextDecoder('utf-8', { fatal: false })
export const asText = (bytes) => {
  try {
    return utf8.decode(bytes)
  } catch {
    return ''
  }
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
// A backslash or a control character in an entry name. Different unpackers
// disagree about what such a name means, which is one way to show a checker one
// thing and whatever opens the file another.
const hasOddName = (name) => {
  for (const character of name) {
    const code = character.codePointAt(0) ?? 0
    if (character === '\\' || code < 32 || code === 127) return true
  }
  return false
}

function readStructure(bytes) {
  const structure = { names: [], duplicateNames: [], malformedNames: [], bytesAfterEnd: 0 }
  if (bytes.length < 22) return structure
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  let eocd = -1
  const earliest = Math.max(0, bytes.length - 0xffff - 22)
  for (let at = bytes.length - 22; at >= earliest; at--) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) {
      eocd = at
      break
    }
  }
  if (eocd < 0) return structure

  const commentLength = view.getUint16(eocd + 20, true)
  structure.bytesAfterEnd = Math.max(0, bytes.length - (eocd + 22 + commentLength))

  const entryCount = view.getUint16(eocd + 10, true)
  let at = view.getUint32(eocd + 16, true)
  const seen = new Set()
  for (let index = 0; index < entryCount; index++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== CENTRAL_SIGNATURE) break
    const nameLength = view.getUint16(at + 28, true)
    const extraLength = view.getUint16(at + 30, true)
    const commentSize = view.getUint16(at + 32, true)
    const name = asText(bytes.subarray(at + 46, at + 46 + nameLength))
    structure.names.push(name)
    if (seen.has(name)) structure.duplicateNames.push(name)
    else seen.add(name)
    if (hasOddName(name)) structure.malformedNames.push(name)
    at += 46 + nameLength + extraLength + commentSize
  }
  return structure
}

export function readArchive(bytes) {
  const unpacked = unzipSync(bytes)
  const entries = []
  for (const [path, data] of Object.entries(unpacked)) {
    if (path.endsWith('/')) continue
    entries.push({ path, data })
  }
  return { entries, structure: readStructure(bytes), byteLength: bytes.byteLength }
}

export const entryAt = (archive, path) => archive.entries.find((entry) => entry.path === path)

// --- jar manifest -----------------------------------------------------------

/** MANIFEST.MF and .SF files: blank-line-separated sections, continuation lines start with a space. */
export function parseManifestSections(text) {
  const sections = []
  for (const block of text.split(/\r?\n\r?\n/)) {
    const unfolded = block.replace(/\r?\n[ \t]/g, '')
    const attributes = new Map()
    for (const line of unfolded.split(/\r?\n/)) {
      const at = line.indexOf(':')
      if (at <= 0) continue
      attributes.set(line.slice(0, at).trim(), line.slice(at + 1).trim())
    }
    if (attributes.size > 0) sections.push(attributes)
  }
  return sections
}

// --- signature --------------------------------------------------------------

const DIGEST_ATTRIBUTES = [
  { attribute: 'SHA-512-Digest', algorithm: 'SHA-512', strong: true },
  { attribute: 'SHA-384-Digest', algorithm: 'SHA-384', strong: true },
  { attribute: 'SHA-256-Digest', algorithm: 'SHA-256', strong: true },
  { attribute: 'SHA1-Digest', algorithm: 'SHA-1', strong: false },
]

const SF_FILE = /^META-INF\/[^/]+\.SF$/i
const BLOCK_FILE = /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i
const MANIFEST_PATH = 'META-INF/MANIFEST.MF'

async function digestBase64(algorithm, data) {
  const buffer = await crypto.subtle.digest(algorithm, data)
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Does the signature still describe this file? ModGuard checks that the
 * contents match the fingerprints recorded when the archive was signed. It does
 * not check who signed it — that needs a certificate chain, which the desktop
 * app carries and this page does not.
 */
export async function checkSignature(archive) {
  const absent = {
    present: false,
    digestsIntact: false,
    manifestDigestOk: null,
    coveredCount: 0,
    tamperedPaths: [],
    uncoveredPaths: [],
    weakDigestOnly: false,
  }
  const signatureFile = archive.entries.find((entry) => SF_FILE.test(entry.path))
  const blockFile = archive.entries.find((entry) => BLOCK_FILE.test(entry.path))
  const manifest = entryAt(archive, MANIFEST_PATH)
  if (signatureFile === undefined || blockFile === undefined || manifest === undefined) return absent

  const sections = parseManifestSections(asText(manifest.data))
  const covered = new Set()
  const tamperedPaths = []
  let strongSeen = false
  let weakSeen = false

  for (const section of sections) {
    const name = section.get('Name')
    if (name === undefined) continue
    const digest = DIGEST_ATTRIBUTES.find((entry) => section.has(entry.attribute))
    if (digest === undefined) continue
    const entry = entryAt(archive, name)
    covered.add(name)
    if (entry === undefined) {
      tamperedPaths.push(name)
      continue
    }
    if (digest.strong) strongSeen = true
    else weakSeen = true
    const actual = await digestBase64(digest.algorithm, entry.data)
    if (actual !== section.get(digest.attribute)) tamperedPaths.push(name)
  }

  if (covered.size === 0) return absent

  // The .SF file's own fingerprint of MANIFEST.MF closes the chain.
  let manifestDigestOk = null
  const signature = parseManifestSections(asText(signatureFile.data))[0]
  if (signature !== undefined) {
    for (const { attribute, algorithm } of DIGEST_ATTRIBUTES) {
      const recorded = signature.get(`${attribute}-Manifest`)
      if (recorded === undefined) continue
      manifestDigestOk = (await digestBase64(algorithm, manifest.data)) === recorded
      break
    }
  }

  const uncoveredPaths = archive.entries
    .filter((entry) => entry.path !== MANIFEST_PATH && !SF_FILE.test(entry.path) && !BLOCK_FILE.test(entry.path))
    .filter((entry) => !covered.has(entry.path))
    .map((entry) => entry.path)

  return {
    present: true,
    digestsIntact: tamperedPaths.length === 0,
    manifestDigestOk,
    coveredCount: covered.size,
    tamperedPaths,
    uncoveredPaths,
    weakDigestOnly: weakSeen && !strongSeen,
  }
}
