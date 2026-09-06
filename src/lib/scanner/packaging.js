/**
 * How well built is this archive?
 *
 * This is what earns a mod the benefit of the doubt. A properly built, signed,
 * intact mod gets the ordinary-behaviour categories discounted to zero, which is
 * what keeps a map mod from being marked down for reaching the internet. An
 * archive that is put together wrongly gets nothing, and a signature that no
 * longer matches its own contents lifts the score cap: that is tampering, and it
 * is the shape a repackaged legitimate mod takes.
 */

import { entryAt } from './archive.js'
import { packageRoot } from './patterns.js'

const PACKAGED_CLASS_RATIO = 0.9
const UNREADABLE_CLASS_RATIO = 0.2

const entryPointClass = (entry) => (entry.split('::')[0] ?? entry).trim().replace(/\./g, '/')

export function assessPackaging({ archive, manifest, classNames, unreadableClassPaths, signature }) {
  const signals = []
  let malformed = false
  let wellFormed = true
  const fault = () => {
    wellFormed = false
  }

  const { structure } = archive
  if (structure.duplicateNames.length > 0) {
    const repeated = structure.duplicateNames.length
    signals.push({ id: 'duplicate-entries', kind: 'negative', detail: `${repeated} ${repeated === 1 ? 'name appears' : 'names appear'} more than once in this archive. No build tool does that, and it means two programs opening this file can read different copies of the same file.` })
    malformed = true
    fault()
  }
  if (structure.bytesAfterEnd > 0) {
    signals.push({ id: 'bytes-after-end', kind: 'negative', detail: `${structure.bytesAfterEnd} bytes sit after the point where the archive ends, invisible to every program that opens a zip.` })
    fault()
  }
  if (structure.malformedNames.length > 0) {
    const odd = structure.malformedNames.length
    signals.push({ id: 'odd-entry-names', kind: 'negative', detail: `${odd} ${odd === 1 ? 'file uses' : 'files use'} a backslash or a control character in its name.` })
    fault()
  }
  for (const problem of manifest.problems) {
    signals.push({ id: 'manifest-unreadable', kind: 'negative', detail: problem })
    malformed = true
    fault()
  }

  const knownLoader = new Set(['fabric', 'forge', 'quilt'])
  const isMod = (manifest.source !== null && knownLoader.has(manifest.source)) || manifest.isServerPlugin
  const isResourcePack =
    classNames.length === 0 && unreadableClassPaths.length === 0 && entryAt(archive, 'pack.mcmeta') !== undefined

  if (isMod) {
    signals.push({ id: 'loader-manifest', kind: 'positive', detail: 'Carries a proper mod-loader description file.' })
    if (manifest.id === undefined || manifest.version === undefined) {
      signals.push({ id: 'identity-incomplete', kind: 'negative', detail: "The description file leaves out the mod's id or version — real builds always set both." })
      fault()
    }
  } else if (isResourcePack) {
    signals.push({ id: 'resource-pack', kind: 'positive', detail: 'This is a resource pack, so there is no behaviour it could run.' })
  } else {
    signals.push({ id: 'no-loader-manifest', kind: 'negative', detail: 'Nothing here identifies this file as a mod any loader would recognise.' })
    fault()
  }

  const hasCode = classNames.length + unreadableClassPaths.length > 0
  const hasAssets = archive.entries.some(
    (entry) => entry.path.startsWith('assets/') || entry.path.startsWith('data/') || entry.path === 'pack.mcmeta',
  )
  if (!hasCode && !hasAssets) {
    signals.push({ id: 'empty-package', kind: 'negative', detail: 'The archive contains no mod code and no assets.' })
    fault()
  }

  const present = new Set(classNames)
  const declared = manifest.entryPoints.map(entryPointClass)
  const missing = declared.filter((name) => !present.has(name))
  if (declared.length > 0) {
    if (missing.length === 0) {
      signals.push({ id: 'entrypoints-present', kind: 'positive', detail: 'The classes the mod says it starts are really in the file.' })
    } else {
      const allMissing = missing.length === declared.length
      signals.push({
        id: 'entrypoints-missing',
        kind: 'negative',
        detail: allMissing
          ? `The mod says it starts ${missing[0]}, but that code is not in this file — a sign the archive was repackaged.`
          : `The mod says it starts ${missing[0]}, but that class is not in this file. The rest of its start-up code is here, so this is usually a class from a dependency.`,
      })
      if (allMissing) fault()
    }
  }

  // Start-up code from two unrelated packages is how a loader gets added to
  // somebody else's mod, so it is treated as proven tampering.
  const rootsOfEntryPoints = new Map()
  for (const name of declared) {
    if (!present.has(name)) continue
    const root = packageRoot(name)
    if (root !== null) rootsOfEntryPoints.set(root, [...(rootsOfEntryPoints.get(root) ?? []), name])
  }
  const provenTampering = rootsOfEntryPoints.size > 1
  if (provenTampering) {
    const described = [...rootsOfEntryPoints].map(([root, names]) => `${root.replace(/\//g, '.')} (${names.join(', ')})`)
    signals.push({
      id: 'entrypoints-unrelated',
      kind: 'negative',
      detail: `This mod starts code from ${rootsOfEntryPoints.size} unrelated places — ${described.join(' and ')}. A mod's own start-up code lives with the rest of its code.`,
    })
    fault()
  }

  if (classNames.length > 0) {
    const packaged = classNames.filter((name) => name.includes('/'))
    if (packaged.length / classNames.length >= PACKAGED_CLASS_RATIO) {
      signals.push({ id: 'packaged-classes', kind: 'positive', detail: 'Code sits in named packages, the way a build tool produces it.' })
    } else {
      signals.push({ id: 'loose-classes', kind: 'negative', detail: `${classNames.length - packaged.length} of ${classNames.length} code files sit loose at the top of the archive with no package name.` })
      fault()
    }
  }

  const totalClasses = classNames.length + unreadableClassPaths.length
  if (unreadableClassPaths.length > 0 && unreadableClassPaths.length / totalClasses > UNREADABLE_CLASS_RATIO) {
    signals.push({ id: 'unreadable-classes', kind: 'negative', detail: `${unreadableClassPaths.length} of ${totalClasses} code files are malformed and could not be read.` })
    malformed = true
    fault()
  }

  let signedAndIntact = false
  if (signature.present) {
    if (!signature.digestsIntact || signature.manifestDigestOk === false) {
      signals.push({
        id: 'signature-broken',
        kind: 'negative',
        detail:
          signature.tamperedPaths.length > 0
            ? `This archive is signed, but ${signature.tamperedPaths.slice(0, 3).join(', ')} no longer ${signature.tamperedPaths.length === 1 ? 'matches the fingerprint' : 'match the fingerprints'} recorded when it was signed — the file was altered after signing.`
            : 'This archive is signed, but its own signature bookkeeping no longer adds up — the file was altered after signing.',
      })
      malformed = true
      fault()
    }
    if (signature.uncoveredPaths.length > 0) {
      const added = signature.uncoveredPaths.length
      signals.push({ id: 'signature-partial', kind: 'negative', detail: `The signature covers ${signature.coveredCount} files, but ${added} ${added === 1 ? 'file was' : 'files were'} added afterwards and ${added === 1 ? 'is' : 'are'} not covered by it.` })
    }
    const intact = signature.digestsIntact && signature.manifestDigestOk !== false && signature.uncoveredPaths.length === 0
    if (intact && signature.manifestDigestOk === null) {
      signals.push({ id: 'signature-unanchored', kind: 'positive', detail: `Every one of the ${signature.coveredCount} files matches the fingerprints in the archive's manifest, but the signature file records no fingerprint of that manifest.` })
    } else if (intact) {
      signedAndIntact = true
      signals.push({ id: 'signature-intact', kind: 'positive', detail: `Signed archive: all ${signature.coveredCount} files still match the fingerprints recorded when it was signed.` })
      if (signature.weakDigestOnly) {
        signals.push({ id: 'signature-weak-digest', kind: 'negative', detail: 'The signature uses an outdated fingerprint method (SHA-1/MD5).' })
      }
    }
  }

  const level = malformed
    ? 'malformed'
    : wellFormed
      ? signedAndIntact && !signature.weakDigestOnly
        ? 'verified'
        : 'valid'
      : 'unverified'

  // A broken signature is proof the file changed after somebody vouched for it.
  const tamperedAfterSigning = signature.present && (!signature.digestsIntact || signature.manifestDigestOk === false)

  return { level, signals, provenTampering: provenTampering || tamperedAfterSigning }
}
