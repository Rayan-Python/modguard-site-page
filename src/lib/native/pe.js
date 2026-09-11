/**
 * Windows binary primitives: PE header reading, entropy, and string extraction.
 *
 * This is the genuinely game-agnostic layer. A PE header means the same thing in
 * a Skyrim SKSE plugin, a Cyberpunk RED4ext plugin and a GTA ASI plugin, because
 * it is a property of the Windows executable format and not of any game. The
 * game-specific knowledge lives in signatures.js, away from this.
 *
 * Everything here runs on a Uint8Array in the browser. No Node Buffer, no fs.
 */

const MZ = 0x5a4d
const PE_SIGNATURE = 0x00004550
const PE32_PLUS = 0x20b

const MACHINE_NAMES = new Map([
  [0x014c, 'x86 (32-bit)'],
  [0x8664, 'x64'],
  [0x01c0, 'ARM'],
  [0xaa64, 'ARM64'],
  [0x0200, 'Itanium'],
])

// Characteristics bit 0x2000: the image is a DLL rather than an executable.
const IMAGE_FILE_DLL = 0x2000

const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

/** "MZ" at offset 0. True for .exe, .dll and .asi alike — .asi is a renamed DLL. */
export function isPE(bytes) {
  return bytes.length > 0x40 && view(bytes).getUint16(0, true) === MZ
}

/**
 * Enough of the PE header to answer the questions that matter for triage:
 * is it really a PE, is it signed, what is it built for, and is it a DLL.
 *
 * Returns null for anything that is not a readable PE rather than throwing,
 * because "this is not a Windows binary" is an ordinary answer here.
 */
export function parsePEHeader(bytes) {
  if (!isPE(bytes)) return null
  const data = view(bytes)
  try {
    const peOffset = data.getUint32(0x3c, true)
    if (peOffset + 24 > bytes.length) return null
    if (data.getUint32(peOffset, true) !== PE_SIGNATURE) return null

    const coff = peOffset + 4
    const machine = data.getUint16(coff, true)
    const sectionCount = data.getUint16(coff + 2, true)
    const timestamp = data.getUint32(coff + 4, true)
    const characteristics = data.getUint16(coff + 18, true)

    const optional = coff + 20
    if (optional + 2 > bytes.length) return null
    const magic = data.getUint16(optional, true)
    const isPE32Plus = magic === PE32_PLUS

    // Data directory 4 is the Authenticode certificate table. A non-zero size
    // means the file carries an embedded signature. It does NOT mean the
    // signature is valid or that the signer is anybody in particular — checking
    // that needs a certificate chain, which the browser will not give us.
    const dataDirectories = isPE32Plus ? optional + 112 : optional + 96
    const securityDirectory = dataDirectories + 4 * 8
    let hasSignature = false
    if (securityDirectory + 8 <= bytes.length) {
      hasSignature = data.getUint32(securityDirectory + 4, true) > 0
    }

    const sections = readSections(bytes, data, optional + (isPE32Plus ? 240 : 224), sectionCount)

    return {
      machine: MACHINE_NAMES.get(machine) ?? `unknown (0x${machine.toString(16)})`,
      sectionCount,
      sections,
      isPE32Plus,
      hasSignature,
      isDll: (characteristics & IMAGE_FILE_DLL) !== 0,
      compiledAt: timestamp > 0 ? new Date(timestamp * 1000) : null,
    }
  } catch {
    return null
  }
}

function readSections(bytes, data, offset, count) {
  const sections = []
  if (count > 96) return sections
  for (let i = 0; i < count; i++) {
    const at = offset + i * 40
    if (at + 40 > bytes.length) break
    let name = ''
    for (let c = 0; c < 8; c++) {
      const byte = bytes[at + c]
      if (byte === 0) break
      name += String.fromCharCode(byte)
    }
    sections.push({
      name,
      virtualSize: data.getUint32(at + 8, true),
      rawSize: data.getUint32(at + 16, true),
      rawOffset: data.getUint32(at + 20, true),
      characteristics: data.getUint32(at + 36, true),
    })
  }
  return sections
}

/**
 * Section names packers leave behind. A normal MSVC or MinGW build writes
 * .text/.rdata/.data/.rsrc/.reloc; these are what the common packers rename
 * them to, and a mod that has been through one is a mod whose code nobody can
 * read without unpacking it first.
 */
const PACKER_SECTIONS = new Map([
  ['UPX0', 'UPX'], ['UPX1', 'UPX'], ['UPX2', 'UPX'],
  ['.aspack', 'ASPack'], ['.adata', 'ASPack'],
  ['.themida', 'Themida'], ['.winlice', 'WinLicense'],
  ['.vmp0', 'VMProtect'], ['.vmp1', 'VMProtect'], ['.vmp2', 'VMProtect'],
  ['.enigma1', 'Enigma'], ['.enigma2', 'Enigma'],
  ['.petite', 'Petite'], ['.MPRESS1', 'MPRESS'], ['.MPRESS2', 'MPRESS'],
  ['.nsp0', 'NsPack'], ['.perplex', 'Perplex'], ['.boom', 'BoomProtect'],
])

export function detectPacker(header) {
  if (header === null) return null
  for (const section of header.sections) {
    const packer = PACKER_SECTIONS.get(section.name)
    if (packer !== undefined) return { packer, section: section.name }
  }
  return null
}

/**
 * Shannon entropy, 0 (all one byte value) to 8 (uniformly random).
 *
 * Packed and encrypted payloads sit above ~7.2. So do ordinary compressed
 * resources, which is why this is never a finding on its own — it is a reason to
 * weight the other findings, and it is scored that way.
 */
export function shannonEntropy(bytes) {
  if (bytes.length === 0) return 0
  const counts = new Uint32Array(256)
  for (let i = 0; i < bytes.length; i++) counts[bytes[i]]++
  let entropy = 0
  for (const count of counts) {
    if (count === 0) continue
    const p = count / bytes.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

/**
 * Entropy of the code sections alone.
 *
 * Whole-file entropy on a binary that ships a few megabytes of compressed
 * textures reads high for an honest reason. The executable sections are where
 * packing actually shows, so they are measured separately.
 */
export function codeSectionEntropy(bytes, header) {
  if (header === null || header.sections.length === 0) return null
  const IMAGE_SCN_CNT_CODE = 0x00000020
  let highest = null
  for (const section of header.sections) {
    if ((section.characteristics & IMAGE_SCN_CNT_CODE) === 0) continue
    if (section.rawSize === 0 || section.rawOffset + section.rawSize > bytes.length) continue
    const slice = bytes.subarray(section.rawOffset, section.rawOffset + Math.min(section.rawSize, 1024 * 512))
    const entropy = shannonEntropy(slice)
    if (highest === null || entropy > highest.entropy) highest = { section: section.name, entropy }
  }
  return highest
}

const MAX_STRINGS = 60_000

/**
 * Printable ASCII and UTF-16LE runs. Compiled code keeps its API names, URLs and
 * shell commands as plain text, so this is the cheap read that finds most of
 * what matters without disassembling anything.
 */
export function extractStrings(bytes, minLength = 5) {
  const results = []
  const limit = Math.min(bytes.length, 8 * 1024 * 1024)

  let current = ''
  for (let i = 0; i < limit && results.length < MAX_STRINGS; i++) {
    const byte = bytes[i]
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte)
    } else {
      if (current.length >= minLength) results.push(current)
      current = ''
    }
  }
  if (current.length >= minLength) results.push(current)

  current = ''
  for (let i = 0; i + 1 < limit && results.length < MAX_STRINGS; i += 2) {
    if (bytes[i + 1] === 0x00 && bytes[i] >= 0x20 && bytes[i] <= 0x7e) {
      current += String.fromCharCode(bytes[i])
    } else {
      if (current.length >= minLength) results.push(current)
      current = ''
    }
  }
  if (current.length >= minLength) results.push(current)

  return results
}

/** SHA-256 as lowercase hex, for the hash lists. */
export async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
