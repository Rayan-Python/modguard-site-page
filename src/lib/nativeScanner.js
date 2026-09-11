/**
 * The native-file scanner: Windows mod menus, injectors, trainers and ASI/SKSE
 * plugins for open-world games the desktop app does not reach.
 *
 * This is a separate engine from the Java/Minecraft scanner in modScanner.js and
 * shares no code with it on purpose. A .jar and a .dll are different formats with
 * different threat models, and one set of weights cannot mean the same thing in
 * both. They meet only at the risk gauge, which takes a number.
 *
 * Everything runs in the browser on a Uint8Array. No file leaves the page.
 */

import { unzipSync } from 'fflate'
import {
  codeSectionEntropy,
  detectPacker,
  extractStrings,
  isPE,
  parsePEHeader,
  sha256,
  shannonEntropy,
} from './native/pe.js'
import { lookupHash } from './native/hashes.js'
import {
  GAME_PROFILES,
  NATIVE_CODE_EXTENSIONS,
  NEVER_IN_A_MOD,
  identifyGame,
  matchSelfDescription,
  matchSignatures,
} from './native/signatures.js'

const MAX_SCORE = 99
const MAX_ARCHIVE_ENTRIES = 600
const MAX_NESTED_DEPTH = 4
const MAX_SCANNED_BINARIES = 40

const extensionOf = (name) => {
  const base = name.split(/[\\/]/).at(-1) ?? name
  const at = base.lastIndexOf('.')
  return at <= 0 ? '' : base.slice(at).toLowerCase()
}

const isZip = (bytes) =>
  bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7)

/**
 * RAR and 7-Zip. ModGuard can see that they are archives and cannot open them —
 * only zip is readable here. Saying so is the whole point: an archive whose
 * contents were never read must not come back as "Safe", because that would be
 * a clean bill of health for something nobody looked inside.
 */
const startsWith = (bytes, signature) => signature.every((byte, index) => bytes[index] === byte)
const unreadableArchive = (bytes) => {
  if (bytes.length < 8) return null
  if (startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])) return 'RAR'
  if (startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return '7-Zip'
  return null
}

// --- one binary -------------------------------------------------------------

/**
 * Read a single native file. Returns the findings for it; scoring happens once,
 * across everything, in `score()`.
 */
async function inspectBinary(bytes, name) {
  const findings = []
  const header = parsePEHeader(bytes)
  const strings = extractStrings(bytes)
  const digest = await sha256(bytes)
  const hash = lookupHash(digest)

  if (hash.verdict === 'known-bad') {
    findings.push({
      id: 'known-bad-hash',
      weight: MAX_SCORE,
      title: 'Matches a file on ModGuard’s known-bad list',
      detail: `${name} is byte-for-byte ${hash.name}. ${hash.note}`,
    })
  }
  if (hash.verdict === 'known-good') {
    findings.push({
      id: 'known-good-hash',
      weight: 0,
      title: 'Matches a file ModGuard has verified',
      detail: `${name} is byte-for-byte ${hash.name}.`,
    })
  }

  const extension = extensionOf(name)
  const claimsNative = NATIVE_CODE_EXTENSIONS.includes(extension)

  // A file's extension is a claim; the header is the fact.
  if (claimsNative && extension !== '.so' && extension !== '.dylib' && header === null && !isPE(bytes)) {
    findings.push({
      id: 'not-really-native',
      weight: 20,
      title: 'Not the kind of file its name claims',
      detail: `${name} is named like a Windows binary but has no PE header, so whatever it is, the game will not load it as a plugin.`,
    })
  }
  if (!claimsNative && isPE(bytes)) {
    findings.push({
      id: 'disguised-binary',
      weight: 38,
      title: 'A Windows program wearing another extension',
      detail: `${name} does not end in .dll, .asi or .exe, but its contents are a Windows executable.`,
    })
  }

  if (header !== null) {
    const packer = detectPacker(header)
    if (packer !== null) {
      findings.push({
        id: 'packed',
        weight: 26,
        title: 'Packed so its code cannot be read as it sits',
        detail: `${name} carries a ${packer.packer} section (${packer.section}). Packing is how a payload travels without being readable, and it is not how mod loaders normally ship.`,
      })
    }

    const codeEntropy = codeSectionEntropy(bytes, header)
    if (codeEntropy !== null && codeEntropy.entropy > 7.4) {
      findings.push({
        id: 'high-entropy-code',
        weight: 18,
        title: 'Executable code looks encrypted or compressed',
        detail: `The ${codeEntropy.section} section of ${name} scores ${codeEntropy.entropy.toFixed(2)} out of 8 for randomness — the range packed or encrypted code sits in.`,
      })
    }
  }

  const signatureHits = matchSignatures(strings)
  const byId = new Set(signatureHits.map((hit) => hit.id))
  for (const hit of signatureHits) {
    // Hollowing needs the injection primitives beside it to mean anything; the
    // context-switching calls alone are ordinary threading.
    if (hit.requiresPairWith !== undefined && !byId.has(hit.requiresPairWith)) continue
    findings.push({
      id: hit.id,
      weight: hit.weight,
      title: hit.title,
      detail: `${name} references ${hit.matched.slice(0, 4).join(', ')}${hit.matched.length > 4 ? ' and more' : ''}.`,
      standsAlone: hit.standsAlone === true,
    })
  }

  const describes = matchSelfDescription(strings, name)
  const unsigned = header !== null && !header.hasSignature
  if (describes.length > 0 && unsigned) {
    findings.push({
      id: 'unsigned-trainer',
      weight: 16,
      title: 'An unsigned binary that calls itself a trainer or mod menu',
      detail: `${name} describes itself as a "${describes[0]}" and carries no code signature, so there is nothing tying it to whoever built it. Most mod menus are unsigned — this matters next to what else is in the file, not on its own.`,
    })
  }

  return {
    name,
    findings,
    header,
    digest,
    strings,
    entropy: shannonEntropy(bytes.subarray(0, 1024 * 512)),
    byteLength: bytes.byteLength,
  }
}

// --- archives ---------------------------------------------------------------

function readArchive(bytes) {
  try {
    return unzipSync(bytes)
  } catch {
    return null
  }
}

/**
 * Walk an archive, reading every native binary in it and recursing into nested
 * archives. Archive recursion is one of the parts of the reference approach that
 * is entirely game-agnostic — a zip inside a zip is a zip.
 */
async function inspectArchive(bytes, name, depth, budget) {
  const unpacked = readArchive(bytes)
  if (unpacked === null) return { entries: [], binaries: [], findings: [], paths: [] }

  const findings = []
  const binaries = []
  const paths = []
  let entryCount = 0

  for (const [path, data] of Object.entries(unpacked)) {
    if (path.endsWith('/')) continue
    if (entryCount++ > MAX_ARCHIVE_ENTRIES) break
    paths.push(path)
    const extension = extensionOf(path)

    if (NEVER_IN_A_MOD.includes(extension)) {
      findings.push({
        id: 'program-in-archive',
        weight: extension === '.exe' || extension === '.msi' ? 30 : 22,
        title: 'Carries a program a mod has no use for',
        detail: `${name} contains ${path}, which the game never loads — it is a program or script in its own right.`,
      })
    }

    if (budget.binaries >= MAX_SCANNED_BINARIES) continue

    if (isZip(data) && depth < MAX_NESTED_DEPTH) {
      const nested = await inspectArchive(data, path, depth + 1, budget)
      findings.push(...nested.findings)
      binaries.push(...nested.binaries)
      paths.push(...nested.paths)
      continue
    }

    if (NATIVE_CODE_EXTENSIONS.includes(extension) || isPE(data)) {
      budget.binaries++
      binaries.push(await inspectBinary(data, path))
    }
  }

  return { binaries, findings, paths }
}

// --- scoring ----------------------------------------------------------------

/**
 * Combine every finding into one number.
 *
 * The heaviest finding sets the floor and the rest add at a discount, so a file
 * with one real problem is not outscored by a file with six small ones. Findings
 * marked `standsAlone` skip the discount: a Defender exclusion means what it
 * means whether or not anything else turned up.
 */
/**
 * Pairs that are a finished attack rather than two separate observations.
 * Reading the file your Steam login is in means one thing; reading it in a
 * binary that also has a webhook to post it to means the other.
 */
const COMPLETING_PAIRS = [
  { ids: ['credential-theft', 'exfiltration'], bonus: 18 },
  { ids: ['credential-theft', 'downloader'], bonus: 12 },
  { ids: ['keylogging', 'exfiltration'], bonus: 18 },
  { ids: ['process-injection', 'downloader'], bonus: 12 },
]

function score(findings) {
  if (findings.some((finding) => finding.id === 'known-good-hash')) return 0
  if (findings.length === 0) return 0

  const present = new Set(findings.map((finding) => finding.id))
  const weights = findings.map((finding) => finding.weight).sort((a, b) => b - a)
  const [leading = 0, ...rest] = weights
  const support = rest.reduce((sum, weight) => sum + Math.round(weight * 0.45), 0)
  const pairs = COMPLETING_PAIRS.filter((pair) => pair.ids.every((id) => present.has(id)))
    .reduce((sum, pair) => sum + pair.bonus, 0)
  const standalone = findings
    .filter((finding) => finding.standsAlone === true)
    .reduce((max, finding) => Math.max(max, finding.weight), 0)

  return Math.min(MAX_SCORE, Math.max(leading + support + pairs, standalone === 0 ? 0 : standalone + 20))
}

const verdictFor = (total) => (total >= 60 ? 'Malicious' : total >= 30 ? 'Suspicious' : 'Safe')

/** One or two sentences saying why, for the gauge to sit beside. */
function explain(verdict, findings, game, isArchive) {
  if (findings.length === 0) {
    return game === null
      ? 'Nothing ModGuard checks for turned up in this file. That is not a clean bill of health — a static read cannot see what a program does once it runs.'
      : `Nothing ModGuard checks for turned up in this ${game.label} file. A static read cannot see what a program does once it runs, so this is not a guarantee.`
  }
  const leading = [...findings].sort((a, b) => b.weight - a.weight)[0]
  const opening =
    verdict === 'Malicious'
      ? 'Do not run this.'
      : verdict === 'Suspicious'
        ? 'Worth understanding before you run it.'
        : 'Mostly ordinary, with something worth knowing about.'
  // The titles are written as headlines, so they are used as written rather than
  // spliced into the sentence — "It a Windows program wearing another extension"
  // is what splicing produces, and the finding detail already says where it is.
  const trimmed = leading.title.replace(/\.$/, '')
  return `${opening} ${trimmed}${isArchive ? ', inside this archive' : ''}.`
}

// --- the scan ---------------------------------------------------------------

/**
 * Scan a native mod file: a .dll, .asi, .exe, or an archive of them.
 *
 * @param {Uint8Array} bytes the whole file
 * @param {string} fileName what it was called, treated as a claim rather than a fact
 */
export async function scanNativeFile(bytes, fileName = '') {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    return {
      verdict: null,
      riskScore: null,
      explanation: 'That file is empty, so there was nothing to read.',
      findings: [],
      game: null,
    }
  }

  const sealed = unreadableArchive(bytes)
  if (sealed !== null) {
    return {
      verdict: null,
      riskScore: null,
      explanation: `This is a ${sealed} archive, and ModGuard can only open zip files here. Nothing inside it was checked — that is neither a problem found nor a clean bill of health. Unpack it and scan the .dll, .asi or .exe inside.`,
      findings: [],
      game: null,
      isArchive: true,
    }
  }

  const archive = isZip(bytes)
  const budget = { binaries: 0 }

  let findings = []
  let binaries = []
  let paths = []

  if (archive) {
    const result = await inspectArchive(bytes, fileName || 'the archive', 0, budget)
    findings = result.findings
    binaries = result.binaries
    paths = result.paths
    if (binaries.length === 0 && findings.length === 0) {
      findings.push({
        id: 'no-native-code',
        weight: 0,
        title: 'No native code inside',
        detail: 'This archive holds no Windows binaries, so there was nothing for this scanner to read. If it is a Minecraft mod, use the mod scanner instead.',
      })
    }
  } else {
    const binary = await inspectBinary(bytes, fileName || 'this file')
    binaries = [binary]
    findings = binary.findings
    if (!isPE(bytes) && binary.header === null) {
      findings = findings.filter((finding) => finding.id !== 'not-really-native')
      findings.unshift({
        id: 'not-a-windows-binary',
        weight: 0,
        title: 'Not a Windows binary',
        detail: 'ModGuard could not read this as a Windows executable. If it is a Minecraft mod or a schematic, use the mod scanner instead.',
      })
    }
  }

  for (const binary of binaries) findings.push(...binary.findings.filter((f) => !findings.includes(f)))

  // Deduplicate by id + detail so a group hitting in five bundled DLLs reads once.
  const seen = new Set()
  const merged = []
  for (const finding of findings) {
    const key = `${finding.id}:${finding.detail}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(finding)
  }

  const allStrings = binaries.flatMap((binary) => binary.strings ?? [])
  const game = identifyGame(allStrings, paths, fileName)

  const scored = merged.filter((finding) => finding.weight > 0)
  const total = score(scored)
  const verdict = verdictFor(total)

  return {
    verdict,
    riskScore: total,
    explanation: explain(verdict, scored, game, archive),
    findings: merged
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map(({ id, title, detail, weight }) => ({ id, title, detail, weight })),
    game: game === null ? null : { id: game.id, label: game.label },
    binariesRead: binaries.length,
    isArchive: archive,
    signed: binaries.some((binary) => binary.header?.hasSignature === true),
  }
}

export { GAME_PROFILES }
