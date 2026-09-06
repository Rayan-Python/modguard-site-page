/**
 * What the file says about itself: which loader it is built for, what it starts,
 * and which nested jars it admits to carrying.
 *
 * The last one is what separates ordinary JarInJar packaging from a jar smuggled
 * inside another. A declared nested jar is how Fabric, Quilt and NeoForge ship
 * libraries; an undeclared one is code the description file never mentions.
 */

import { asText, entryAt, parseManifestSections } from './archive.js'
import { AGENT_MANIFEST } from './patterns.js'

const asArray = (value) => (Array.isArray(value) ? value : [])

function entryPointNames(entrypoints) {
  if (entrypoints === null || typeof entrypoints !== 'object') return []
  const names = []
  for (const list of Object.values(entrypoints)) {
    for (const item of asArray(list)) {
      if (typeof item === 'string') names.push(item)
      else if (item !== null && typeof item === 'object' && typeof item.value === 'string') names.push(item.value)
    }
  }
  return names
}

function mixinConfigs(value) {
  const files = []
  for (const item of asArray(value)) {
    if (typeof item === 'string') files.push(item)
    else if (item !== null && typeof item === 'object' && typeof item.config === 'string') files.push(item.config)
  }
  return files
}

function declaredJarPaths(value) {
  const paths = []
  for (const item of asArray(value)) {
    if (typeof item === 'string') paths.push(item)
    else if (item !== null && typeof item === 'object' && typeof item.file === 'string') paths.push(item.file)
  }
  return paths
}

const readJson = (archive, path) => {
  const entry = entryAt(archive, path)
  if (entry === undefined) return { present: false, json: null }
  try {
    return { present: true, json: JSON.parse(asText(entry.data)) }
  } catch {
    return { present: true, json: null }
  }
}

// mods.toml is TOML, but the fields these checks need are all simple key = "value"
// lines, so a full TOML parser would be weight for nothing.
function tomlValues(text, key) {
  const values = []
  for (const match of text.matchAll(new RegExp(String.raw`^\s*${key}\s*=\s*["']([^"']*)["']`, 'gm'))) {
    values.push(match[1])
  }
  return values
}

export function readModManifest(archive) {
  const manifest = {
    source: null,
    id: undefined,
    name: undefined,
    version: undefined,
    entryPoints: [],
    declaredFiles: [],
    nestedJars: [],
    dependencies: [],
    isServerPlugin: false,
    declaresJavaAgent: false,
    problems: [],
  }

  const fabric = readJson(archive, 'fabric.mod.json')
  if (fabric.present) {
    if (fabric.json === null) manifest.problems.push('fabric.mod.json is present but could not be read as JSON.')
    else {
      const json = fabric.json
      manifest.source = 'fabric'
      if (typeof json.id === 'string') manifest.id = json.id
      if (typeof json.name === 'string') manifest.name = json.name
      if (typeof json.version === 'string') manifest.version = json.version
      manifest.entryPoints.push(...entryPointNames(json.entrypoints))
      manifest.declaredFiles.push(...mixinConfigs(json.mixins))
      if (typeof json.accessWidener === 'string') manifest.declaredFiles.push(json.accessWidener)
      manifest.nestedJars.push(...declaredJarPaths(json.jars))
      manifest.dependencies.push(...Object.keys(json.depends ?? {}))
    }
  }

  const quilt = readJson(archive, 'quilt.mod.json')
  if (quilt.present) {
    if (quilt.json === null) manifest.problems.push('quilt.mod.json is present but could not be read as JSON.')
    else {
      const loader = quilt.json.quilt_loader ?? {}
      manifest.source ??= 'quilt'
      manifest.id ??= typeof loader.id === 'string' ? loader.id : undefined
      manifest.name ??= typeof loader.metadata?.name === 'string' ? loader.metadata.name : undefined
      manifest.version ??= typeof loader.version === 'string' ? loader.version : undefined
      manifest.entryPoints.push(...entryPointNames(loader.entrypoints))
      manifest.declaredFiles.push(...mixinConfigs(quilt.json.mixin))
      manifest.nestedJars.push(...declaredJarPaths(loader.jars))
    }
  }

  for (const path of ['META-INF/mods.toml', 'META-INF/neoforge.mods.toml']) {
    const entry = entryAt(archive, path)
    if (entry === undefined) continue
    const text = asText(entry.data)
    manifest.source ??= 'forge'
    manifest.id ??= tomlValues(text, 'modId')[0]
    manifest.name ??= tomlValues(text, 'displayName')[0]
    manifest.version ??= tomlValues(text, 'version')[0]
    manifest.declaredFiles.push(...tomlValues(text, 'config'))
  }

  // The pre-1.13 Forge descriptor. The desktop app does not read it, so an old
  // Forge mod is "not a recognised mod package" there; it is a real description
  // file and reading it here costs nothing.
  const legacy = readJson(archive, 'mcmod.info')
  if (legacy.present && legacy.json !== null) {
    const list = Array.isArray(legacy.json) ? legacy.json : asArray(legacy.json.modList)
    const first = list[0]
    if (first !== undefined && first !== null && typeof first === 'object') {
      manifest.source ??= 'forge'
      manifest.id ??= typeof first.modid === 'string' ? first.modid : undefined
      manifest.name ??= typeof first.name === 'string' ? first.name : undefined
      manifest.version ??= typeof first.version === 'string' ? first.version : undefined
    }
  }

  for (const path of ['plugin.yml', 'paper-plugin.yml']) {
    const entry = entryAt(archive, path)
    if (entry === undefined) continue
    const text = asText(entry.data)
    manifest.isServerPlugin = true
    manifest.source ??= 'plugin'
    manifest.name ??= /^name:\s*(.+)$/m.exec(text)?.[1]?.trim()
    manifest.version ??= /^version:\s*(.+)$/m.exec(text)?.[1]?.trim()
    const main = /^main:\s*(.+)$/m.exec(text)?.[1]?.trim()
    if (main !== undefined) manifest.entryPoints.push(main)
  }

  const jarJar = readJson(archive, 'META-INF/jarjar/metadata.json')
  if (jarJar.present && jarJar.json !== null) {
    for (const entry of asArray(jarJar.json.jars)) {
      if (entry !== null && typeof entry === 'object' && typeof entry.path === 'string') {
        manifest.nestedJars.push(entry.path)
      }
    }
  }

  const jarManifest = entryAt(archive, 'META-INF/MANIFEST.MF')
  if (jarManifest !== undefined) {
    const text = asText(jarManifest.data)
    manifest.declaresJavaAgent = AGENT_MANIFEST.test(text)
    const main = parseManifestSections(text)[0]
    if (manifest.source === null && main?.get('Main-Class') !== undefined) manifest.source = 'jar-manifest'
    // Forge's oldest packaging names its coremod in the jar manifest rather than
    // in a description file, and that is start-up code like any other.
    const corePlugin = main?.get('FMLCorePlugin')
    if (corePlugin !== undefined) manifest.entryPoints.push(corePlugin)
  }

  return manifest
}
