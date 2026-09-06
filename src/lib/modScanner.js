/**
 * The mod scanner behind /security-tools.
 *
 * It runs the static half of what ModGuard 1.32.0 runs on your machine: the
 * same behaviour catalogue, the same weights, the same combination rules and
 * the same packaging discounts, over a real class-file reader rather than a
 * text search. A score from here means what it means in the app.
 *
 * What stays in the app: the live sandbox (so the categories that need a mod to
 * actually run are unreachable here), and the hash and reputation lookups. This
 * page never sees the file — everything below runs in the browser.
 */

import { checkSignature, readArchive } from './scanner/archive.js'
import { CATEGORIES, score, verdictFor } from './scanner/catalog.js'
import { ClassFileError, parseClass } from './scanner/classfile.js'
import { detectBehaviours } from './scanner/detect.js'
import { readModManifest } from './scanner/manifest.js'
import { inspectSchematic, namedLikeSchematic, NbtError, readNbt } from './scanner/nbt.js'
import { assessPackaging } from './scanner/packaging.js'
import { packageRoot } from './scanner/patterns.js'

// --- 1. what is this file, really? ------------------------------------------

const startsWith = (bytes, signature) => signature.every((byte, index) => bytes[index] === byte)

const SIGNATURES = [
  { signature: [0x50, 0x4b, 0x03, 0x04], kind: 'zip' },
  { signature: [0x50, 0x4b, 0x05, 0x06], kind: 'zip' },
  { signature: [0x50, 0x4b, 0x07, 0x08], kind: 'zip' },
  { signature: [0x4d, 0x5a], kind: 'executable', what: 'a Windows program (.exe/.dll)' },
  { signature: [0x7f, 0x45, 0x4c, 0x46], kind: 'executable', what: 'a Linux program' },
  { signature: [0xfe, 0xed, 0xfa, 0xce], kind: 'executable', what: 'a macOS program' },
  { signature: [0xce, 0xfa, 0xed, 0xfe], kind: 'executable', what: 'a macOS program' },
  { signature: [0xfe, 0xed, 0xfa, 0xcf], kind: 'executable', what: 'a macOS program' },
  { signature: [0xcf, 0xfa, 0xed, 0xfe], kind: 'executable', what: 'a macOS program' },
  { signature: [0xca, 0xfe, 0xba, 0xbe], kind: 'executable', what: 'a bare compiled Java class' },
  { signature: [0x23, 0x21], kind: 'executable', what: 'a script' },
  { signature: [0x1f, 0x8b], kind: 'nbt', what: 'gzipped data' },
]

export function sniffFormat(bytes) {
  for (const entry of SIGNATURES) {
    if (startsWith(bytes, entry.signature)) return entry
  }
  // Uncompressed NBT starts with a compound tag and a short name.
  if (bytes[0] === 0x0a && bytes.byteLength >= 4) {
    const end = 3 + (((bytes[1] ?? 0) << 8) + (bytes[2] ?? 0))
    if (end < bytes.byteLength && (bytes[end] ?? 255) <= 12) return { kind: 'nbt', what: 'NBT data' }
  }
  if (bytes[0] === 0x78 && ((bytes[0] << 8) + (bytes[1] ?? 0)) % 31 === 0) return { kind: 'nbt', what: 'compressed data' }
  return { kind: 'unknown', what: 'not a format ModGuard recognises' }
}

// --- 2. code, and where it came from ----------------------------------------

const MAX_NESTING_DEPTH = 12
const MAX_NESTED_JARS = 40
const MAX_CLASSES = 20_000

const LIBRARY_PREFIXES = new Map([
  ['org/apache', 'Apache Commons / Log4j'],
  ['org/slf4j', 'SLF4J logging'],
  ['com/google', 'Google (Gson / Guava)'],
  ['com/fasterxml', 'Jackson JSON'],
  ['io/netty', 'Netty networking'],
  ['it/unimi', 'fastutil collections'],
  ['org/joml', 'JOML maths'],
  ['org/lwjgl', 'LWJGL'],
  ['com/mojang', 'Mojang libraries'],
  ['org/objectweb', 'ASM bytecode library'],
  ['org/spongepowered', 'Mixin'],
  ['net/fabricmc', 'Fabric API'],
  ['org/quiltmc', 'Quilt'],
  ['net/neoforged', 'NeoForge'],
  ['net/minecraftforge', 'Forge'],
  ['org/yaml', 'SnakeYAML'],
  ['org/jetbrains', 'JetBrains annotations'],
  ['org/intellij', 'JetBrains annotations'],
  ['org/checkerframework', 'Checker Framework annotations'],
  ['org/jspecify', 'JSpecify annotations'],
  ['javax/annotation', 'JSR-305 annotations'],
  ['kotlin', 'Kotlin runtime'],
  ['kotlinx', 'Kotlin libraries'],
  ['org/antlr', 'ANTLR'],
  ['blue/endless', 'jankson'],
])

// The library table is keyed by the literal package prefix, which is a different
// question from which root a class belongs to.
const libraryPrefix = (className) => {
  const parts = className.split('/')
  return parts.length < 2 ? null : parts.slice(0, Math.min(2, parts.length - 1)).join('/')
}

const libraryFor = (className) => {
  const prefix = libraryPrefix(className)
  if (prefix === null) return null
  return LIBRARY_PREFIXES.get(prefix) ?? LIBRARY_PREFIXES.get(prefix.split('/')[0] ?? prefix) ?? null
}

const OWN_CODE = { kind: 'mod-own', owner: null, note: '', allowsSofterReading: true }

/**
 * Which of these classes are the mod's own, and which it merely ships.
 *
 * It matters twice over. A library's behaviour is reported but discounted, so a
 * mod is not marked down for what Netty does. And start-up code from a package
 * unrelated to the rest is the opposite: that is how a loader gets bolted onto
 * somebody else's mod, so its findings are read at full strength.
 */
function buildOriginResolver(manifest, classNames) {
  const entryPoints = new Set(manifest.entryPoints.map((entry) => (entry.split('::')[0] ?? entry).trim().replace(/\./g, '/')))
  const counts = new Map()
  for (const name of classNames) {
    const root = packageRoot(name)
    if (root !== null) counts.set(root, (counts.get(root) ?? 0) + 1)
  }

  const entryRoots = new Set()
  for (const entry of entryPoints) {
    const root = packageRoot(entry)
    if (root !== null) entryRoots.add(root)
  }

  const ownRoots = new Set()
  const id = (manifest.id ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (id.length >= 3) {
    for (const name of classNames) {
      if (!name.toLowerCase().split('/').slice(0, -1).includes(id)) continue
      const root = packageRoot(name)
      if (root !== null) ownRoots.add(root)
    }
  }

  const sorted = [...entryRoots].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
  const primary = sorted[0]
  const addedEntryRoots = new Set(sorted.slice(1))
  if (primary !== undefined) ownRoots.add(primary)
  if (ownRoots.size === 0) {
    let busiest = null
    let most = 0
    for (const [root, count] of counts) {
      if (count > most) {
        busiest = root
        most = count
      }
    }
    if (busiest !== null) ownRoots.add(busiest)
  }

  const cache = new Map()
  return (className) => {
    const cached = cache.get(className)
    if (cached !== undefined) return cached
    const root = packageRoot(className)
    let origin
    if (root !== null && addedEntryRoots.has(root)) {
      origin = {
        kind: 'added-entrypoint',
        owner: root.replace(/\//g, '.'),
        note: ' (start-up code added to this mod from an unrelated package)',
        allowsSofterReading: false,
      }
    } else if (root === null || ownRoots.has(root) || entryPoints.has(className)) {
      origin = OWN_CODE
    } else {
      const library = libraryFor(className)
      origin =
        library === null
          ? { kind: 'unattributed', owner: null, note: ' (code in this jar that is not in the mod’s own packages)', allowsSofterReading: true }
          : { kind: 'bundled-library', owner: library, note: ` (from ${library}, a library bundled inside this mod)`, allowsSofterReading: true }
    }
    cache.set(className, origin)
    return origin
  }
}

/**
 * Nested jars, to twelve levels. Whether one is *declared* is the whole point:
 * fabric.mod.json's `jars`, quilt.mod.json's, and META-INF/jarjar/metadata.json
 * are how a mod says "this library is mine". A jar that appears in none of them
 * is code the description file never mentions.
 */
function collectNestedJars(archive, manifest, depth = 1, budget = { jars: 0, classes: 0 }) {
  if (depth > MAX_NESTING_DEPTH) return []
  const declared = new Set(manifest.nestedJars)
  const collected = []

  for (const entry of archive.entries) {
    if (!/\.jar$/i.test(entry.path)) continue
    if (budget.jars >= MAX_NESTED_JARS || budget.classes >= MAX_CLASSES) break
    budget.jars++

    let inner
    try {
      inner = readArchive(entry.data)
    } catch {
      continue
    }

    const classes = []
    let unreadable = 0
    for (const innerEntry of inner.entries) {
      if (!innerEntry.path.endsWith('.class')) continue
      if (budget.classes >= MAX_CLASSES) break
      budget.classes++
      try {
        classes.push(parseClass(innerEntry.data))
      } catch {
        unreadable++
      }
    }

    const isDeclared = declared.has(entry.path)
    collected.push({ path: entry.path, declared: isDeclared, classes, unreadableCount: unreadable })

    if (depth < MAX_NESTING_DEPTH) {
      const innerManifest = readModManifest(inner)
      for (const deeper of collectNestedJars(inner, innerManifest, depth + 1, budget)) {
        collected.push({ ...deeper, path: `${entry.path}!/${deeper.path}`, declared: isDeclared && deeper.declared })
      }
    }
  }
  return collected
}

// --- 3. saying what came out ------------------------------------------------

const VERSIONED_CLASS = /^META-INF\/versions\/\d+\//

const sentence = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}${text.endsWith('.') ? '' : '.'}`

function topReasons(breakdown, findings) {
  const byCategory = new Map(findings.map((finding) => [finding.category, finding]))
  const contributions = []

  for (const entry of breakdown.base) {
    if (entry.weight === 0) continue
    contributions.push({
      weight: entry.weight,
      title: CATEGORIES[entry.category].title,
      text: CATEGORIES[entry.category].plain,
      evidence: byCategory.get(entry.category)?.evidence?.[0] ?? null,
    })
  }
  // A combination is worth more than either half, so it is ranked just above the
  // heavier of the two categories that produced it.
  for (const combo of breakdown.combos) {
    contributions.push({
      weight: combo.extraWeight + 1,
      title: 'Two things that mean something together',
      text: combo.reason,
      evidence: null,
    })
  }

  return contributions.sort((a, b) => b.weight - a.weight).slice(0, 3)
}

function explain(verdict, reasons, packaging) {
  if (reasons.length === 0) {
    return packaging === 'unverified' || packaging === 'malformed'
      ? 'None of the behaviours ModGuard checks for turned up, but this file is not put together the way a mod anyone built properly is.'
      : 'None of the behaviours ModGuard checks for turned up, and the archive is put together the way a build tool produces one.'
  }
  const opening =
    verdict === 'Malicious'
      ? 'Do not install this.'
      : verdict === 'Suspicious'
        ? 'Worth a closer look before you trust it.'
        : 'Mostly ordinary, with one thing worth knowing about.'
  return `${opening} ${sentence(reasons[0].text)}`
}

function result({ verdict, riskScore, reasons, explanation, packaging, note }) {
  return { verdict, riskScore, reasons, explanation, packaging, ...(note === undefined ? {} : { note }) }
}

const unreadable = (explanation) =>
  result({ verdict: null, riskScore: null, reasons: [], explanation, packaging: null })

// --- 4. the scan ------------------------------------------------------------

async function scanArchive(bytes, fileName) {
  let archive
  try {
    archive = readArchive(bytes)
  } catch {
    return unreadable('This file starts like an archive but could not be unpacked, so nothing inside it was checked. That is neither a problem found nor a clean bill of health.')
  }

  const manifest = readModManifest(archive)

  const classes = []
  const unreadableClassPaths = []
  for (const entry of archive.entries) {
    if (!entry.path.endsWith('.class')) continue
    if (classes.length >= MAX_CLASSES) break
    try {
      classes.push(parseClass(entry.data))
    } catch (error) {
      if (error instanceof ClassFileError) unreadableClassPaths.push(entry.path)
    }
  }

  const nestedJars = collectNestedJars(archive, manifest)
  const classNames = classes.map((cls) => cls.className)
  const originOf = buildOriginResolver(manifest, classNames)

  const units = classes.map((cls) => ({ cls, origin: originOf(cls.className) }))
  for (const nested of nestedJars) {
    const origin = {
      kind: 'nested-jar',
      owner: nested.path,
      note: nested.declared
        ? ` (inside ${nested.path}, a library this mod ships and declares in its description file)`
        : ` (inside ${nested.path}, a jar bundled in this mod that its description file never mentions)`,
      allowsSofterReading: nested.declared,
    }
    for (const cls of nested.classes) units.push({ cls, origin })
  }

  const signature = await checkSignature(archive)
  const packaging = assessPackaging({
    archive,
    manifest,
    classNames: classNames.map((name) => name.replace(VERSIONED_CLASS, '')),
    unreadableClassPaths,
    signature,
  })

  const { findings, localities } = detectBehaviours({ archive, manifest, units, unreadableClassPaths, nestedJars })

  // A behaviour seen only in a bundled library, and only in the categories that
  // are ordinary for one, is the library's rather than the mod's.
  const LIBRARY_FORGIVEN = ['ACTS_AS_YOU_IN_GAME', 'MOVES_YOUR_ITEMS']
  const counted = findings.filter((finding) => !(finding.libraryOnly && LIBRARY_FORGIVEN.includes(finding.category)))

  const breakdown = score(counted.map((finding) => finding.category), {
    packaging: packaging.level,
    provenTampering: packaging.provenTampering,
    localities,
  })
  const verdict = verdictFor(breakdown.total)
  const reasons = topReasons(breakdown, counted)

  return result({
    verdict,
    riskScore: breakdown.total,
    reasons,
    explanation: explain(verdict, reasons, packaging.level),
    packaging: packaging.level,
  })
}

function scanSchematic(bytes, fileName) {
  let parsed
  try {
    parsed = readNbt(bytes)
  } catch (error) {
    if (!(error instanceof NbtError)) throw error
    if (['inflated-too-far', 'too-deep', 'too-many-nodes'].includes(error.reason)) {
      return scoreSchematic(['LOOKS_LIKE_A_BOMB'], 'Delete it. This file is built the way a crash attack is — reading it would exhaust whatever opens it.')
    }
    if (error.reason === 'trailing-data') {
      return scoreSchematic(['PRETENDS_TO_BE_A_SCHEMATIC'], 'Do not load this into a schematic tool. It opens as a schematic but has a whole other file hidden after the block data.')
    }
    return unreadable('This file could not be read as a schematic or as a mod archive, so nothing in it was checked.')
  }

  const scan = inspectSchematic(parsed)
  const categories = []
  if (scan.dangerous.length > 0) categories.push('CARRIES_A_DANGEROUS_COMMAND')
  if (scan.commandBlockCount > 0 || scan.commands.length > 0) categories.push('RUNS_COMMANDS_WHEN_PLACED')

  const explanation =
    scan.dangerous.length > 0
      ? `Do not place this build in a world with cheats or command blocks enabled. It carries ${scan.dangerous.length === 1 ? 'a command that runs' : `${scan.dangerous.length} commands that run`} under your name once the build is placed — ${scan.dangerous[0].why}.`
      : scan.commandBlockCount > 0
        ? `This ${scan.format} build contains ${scan.commandBlockCount} command ${scan.commandBlockCount === 1 ? 'block' : 'blocks'}, so it can run commands under your name in a world where commands are allowed. That is normal for redstone and map builds.`
        : `This is ${/^[AEIOUN]/.test(scan.format) ? 'an' : 'a'} ${scan.format} file — a saved Minecraft build, with no command blocks and nothing pretending to be something it is not. A schematic is block data, so it cannot run code on your computer the way a mod can.`

  return scoreSchematic(categories, explanation)
}

function scoreSchematic(categories, explanation) {
  const breakdown = score(categories, { packaging: 'unverified' })
  const verdict = verdictFor(breakdown.total)
  return result({
    verdict,
    riskScore: breakdown.total,
    reasons: topReasons(breakdown, categories.map((category) => ({ category, evidence: [] }))),
    explanation,
    packaging: 'unverified',
  })
}

/**
 * Scan one file. `bytes` is the whole file; `fileName` is what it was called,
 * which is a claim about the contents that this checks rather than trusts.
 */
export async function scanFile(bytes, fileName = '') {
  const format = sniffFormat(bytes)
  const claimsSchematic = namedLikeSchematic(fileName)

  // The filename check, before anything is unpacked. A file whose bytes are a
  // program is a program, whatever it is called.
  if (format.kind === 'executable') {
    const breakdown = score(['HIDES_AN_EXECUTABLE'], { packaging: 'unverified' })
    return result({
      verdict: verdictFor(breakdown.total),
      riskScore: breakdown.total,
      reasons: [
        {
          weight: CATEGORIES.HIDES_AN_EXECUTABLE.weight,
          title: CATEGORIES.HIDES_AN_EXECUTABLE.title,
          text: `its contents are ${format.what}, not ${claimsSchematic ? 'a saved build' : 'a mod'}`,
          evidence: null,
        },
      ],
      explanation: `Delete this. It is named like ${claimsSchematic ? 'a schematic' : 'a mod'}, but its contents are ${format.what} — a program, not something the game loads.`,
      packaging: 'malformed',
    })
  }

  if (format.kind === 'zip') {
    const scan = await scanArchive(bytes, fileName)
    if (!claimsSchematic || scan.verdict === null) return scan
    // A .schem that is really a zip of code: read it as the program it is, and
    // add the disguise on top.
    const categories = ['PRETENDS_TO_BE_A_SCHEMATIC']
    const breakdown = score(categories, { packaging: 'unverified' })
    const total = Math.max(breakdown.total, scan.riskScore)
    return result({
      verdict: verdictFor(total),
      riskScore: total,
      reasons: [
        {
          weight: CATEGORIES.PRETENDS_TO_BE_A_SCHEMATIC.weight,
          title: CATEGORIES.PRETENDS_TO_BE_A_SCHEMATIC.title,
          text: 'it is named like a schematic but its contents are a program archive',
          evidence: null,
        },
        ...scan.reasons,
      ].slice(0, 3),
      explanation: 'This is named like a schematic but its contents are a program archive. ModGuard read it as the program it is.',
      packaging: scan.packaging,
    })
  }

  if (format.kind === 'nbt' || claimsSchematic) return scanSchematic(bytes, fileName)

  return unreadable('ModGuard could not read this file as a mod archive or a schematic, so nothing inside it was checked. That is neither a problem found nor a clean bill of health.')
}
