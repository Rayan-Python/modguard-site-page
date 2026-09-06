/**
 * Schematics: .litematic, .schem, .schematic and .nbt.
 *
 * A schematic is block data, so it cannot run code on your computer the way a
 * mod can. Two things about one can still hurt you: a command block that runs a
 * command under your name once the build is placed, and a file built to crash
 * whatever opens it. The reader below has hard limits for exactly that reason —
 * the limits are the check.
 */

import { gunzipSync, inflateSync } from 'fflate'

export class NbtError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'NbtError'
    this.reason = reason
  }
}

const MAX_INFLATED = 96 * 1024 * 1024
const MAX_DEPTH = 512
const MAX_NODES = 8_000_000

const utf8 = new TextDecoder('utf-8', { fatal: false })

const isGzip = (bytes) => bytes[0] === 0x1f && bytes[1] === 0x8b
const isZlib = (bytes) => bytes[0] === 0x78 && [0x01, 0x9c, 0xda, 0x5e].includes(bytes[1] ?? 0) && ((bytes[0] << 8) + (bytes[1] ?? 0)) % 31 === 0

function decompress(bytes) {
  if (isGzip(bytes)) {
    // gzip records its uncompressed size in the last four bytes, so a bomb can
    // be recognised without inflating it.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const declared = view.getUint32(bytes.byteLength - 4, true)
    if (declared > MAX_INFLATED) {
      throw new NbtError('This file unpacks to more than ModGuard will inflate.', 'inflated-too-far')
    }
    try {
      return gunzipSync(bytes)
    } catch {
      throw new NbtError('This file is not readable NBT data.', 'not-nbt')
    }
  }
  if (isZlib(bytes)) {
    try {
      const out = inflateSync(bytes)
      if (out.byteLength > MAX_INFLATED) {
        throw new NbtError('This file unpacks to more than ModGuard will inflate.', 'inflated-too-far')
      }
      return out
    } catch (error) {
      if (error instanceof NbtError) throw error
      throw new NbtError('This file is not readable NBT data.', 'not-nbt')
    }
  }
  return bytes
}

const TAG_END = 0
const TAG_BYTE = 1
const TAG_SHORT = 2
const TAG_INT = 3
const TAG_LONG = 4
const TAG_FLOAT = 5
const TAG_DOUBLE = 6
const TAG_BYTE_ARRAY = 7
const TAG_STRING = 8
const TAG_LIST = 9
const TAG_COMPOUND = 10
const TAG_INT_ARRAY = 11
const TAG_LONG_ARRAY = 12

class NbtReader {
  constructor(bytes) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.at = 0
    this.nodes = 0
  }
  need(count) {
    if (this.at + count > this.bytes.length) throw new NbtError('This file ends in the middle of its data.', 'not-nbt')
  }
  u1() {
    this.need(1)
    return this.view.getUint8(this.at++)
  }
  i2() {
    this.need(2)
    const value = this.view.getInt16(this.at)
    this.at += 2
    return value
  }
  i4() {
    this.need(4)
    const value = this.view.getInt32(this.at)
    this.at += 4
    return value
  }
  skip(count) {
    this.need(count)
    this.at += count
  }
  string() {
    const length = this.i2() & 0xffff
    this.need(length)
    const text = utf8.decode(this.bytes.subarray(this.at, this.at + length))
    this.at += length
    return text
  }
  value(type, depth) {
    if (depth > MAX_DEPTH) throw new NbtError('This data is nested thousands of levels deep.', 'too-deep')
    if (++this.nodes > MAX_NODES) throw new NbtError('This file holds an astronomical number of tags.', 'too-many-nodes')
    switch (type) {
      case TAG_BYTE:
        return { type: 'byte', value: this.u1() }
      case TAG_SHORT:
        return { type: 'short', value: this.i2() }
      case TAG_INT:
        return { type: 'int', value: this.i4() }
      case TAG_LONG:
        this.skip(8)
        return { type: 'long' }
      case TAG_FLOAT:
        this.skip(4)
        return { type: 'float' }
      case TAG_DOUBLE:
        this.skip(8)
        return { type: 'double' }
      case TAG_BYTE_ARRAY:
        this.skip(Math.max(0, this.i4()))
        return { type: 'byte_array' }
      case TAG_STRING:
        return { type: 'string', value: this.string() }
      case TAG_INT_ARRAY:
        this.skip(Math.max(0, this.i4()) * 4)
        return { type: 'int_array' }
      case TAG_LONG_ARRAY:
        this.skip(Math.max(0, this.i4()) * 8)
        return { type: 'long_array' }
      case TAG_LIST: {
        const itemType = this.u1()
        const count = this.i4()
        const items = []
        for (let index = 0; index < count; index++) {
          if (itemType === TAG_END) break
          items.push(this.value(itemType, depth + 1))
        }
        return { type: 'list', items }
      }
      case TAG_COMPOUND: {
        const entries = new Map()
        for (;;) {
          const inner = this.u1()
          if (inner === TAG_END) break
          const name = this.string()
          entries.set(name, this.value(inner, depth + 1))
        }
        return { type: 'compound', entries }
      }
      default:
        throw new NbtError(`Unknown NBT tag ${type}.`, 'not-nbt')
    }
  }
}

export function readNbt(bytes) {
  const data = decompress(bytes)
  const reader = new NbtReader(data)
  if (reader.u1() !== TAG_COMPOUND) throw new NbtError('This file is not readable NBT data.', 'not-nbt')
  reader.string() // root name
  const root = reader.value(TAG_COMPOUND, 0)
  // A small valid schematic with a whole other file parked after it is how a
  // program is smuggled inside something that opens as a schematic.
  if (reader.at < data.length - 8) {
    throw new NbtError('There is an entire other file after the schematic data.', 'trailing-data')
  }
  return { root }
}

// --- what the build would do ------------------------------------------------

const DANGEROUS_COMMANDS = new Map([
  ['op', 'gives a player operator powers'],
  ['deop', "removes a player's operator powers"],
  ['function', 'runs a datapack function — a whole list of commands you cannot see from here'],
  ['schedule', 'schedules a datapack function to run later'],
  ['datapack', 'enables or disables datapacks, which can add arbitrary commands'],
  ['kill', 'kills entities'],
  ['clear', 'empties inventories'],
])

const bareName = (word) => {
  const lower = (word ?? '').toLowerCase()
  const colon = lower.indexOf(':')
  return colon > 0 && /^[a-z0-9_]+$/.test(lower.slice(0, colon)) ? lower.slice(colon + 1) : lower
}

// `execute ... run <command>` can wrap the real command several times over.
const unwrapExecute = (words) => {
  let current = words
  for (let round = 0; round < 8 && bareName(current[0]) === 'execute'; round++) {
    const at = current.findIndex((word) => bareName(word) === 'run')
    if (at < 0 || at + 1 >= current.length) break
    current = current.slice(at + 1)
  }
  return current
}

const nestedCommandBlockCommand = (text) => {
  const match = text.match(/[Cc]ommand:\s*"((?:[^"\\]|\\.)*)"/)
  return match?.[1] === undefined ? null : match[1].replace(/\\(.)/g, '$1')
}

const clickableCommand = (text) => {
  if (!/"action"\s*:\s*"run_command"/i.test(text)) return null
  const paired = text.match(/"run_command"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/i)
  if (paired?.[1] !== undefined) return paired[1].replace(/\\(.)/g, '$1')
  const loose = text.match(/"value"\s*:\s*"((?:[^"\\]|\\.)*)"/i)
  return loose?.[1] === undefined ? null : loose[1].replace(/\\(.)/g, '$1')
}

function whyDangerous(command, depth = 0) {
  if (depth > 6) return null
  const text = command.trim().replace(/^\//, '')
  const words = text.split(/\s+/).filter((word) => word !== '')
  if (words.length === 0) return null
  const head = bareName(unwrapExecute(words)[0])

  if (/command_block/i.test(text)) {
    const inner = nestedCommandBlockCommand(text)
    if (inner !== null) {
      const why = whyDangerous(inner, depth + 1)
      return why === null ? null : `writes a command block that ${why}`
    }
  }
  const clickable = clickableCommand(text)
  if (clickable !== null) {
    const why = whyDangerous(clickable, depth + 1)
    if (why !== null) return `offers a clickable button that ${why}`
  }

  const meaning = DANGEROUS_COMMANDS.get(head)
  if (meaning === undefined) return null
  // `kill` and `clear` are ordinary unless they are aimed at everyone.
  if ((head === 'kill' || head === 'clear') && !/@[ae](?![\w[])/.test(text)) return null
  return meaning
}

function* compounds(node, depth = 0) {
  if (depth > MAX_DEPTH) return
  if (node.type === 'compound') {
    yield node.entries
    for (const value of node.entries.values()) yield* compounds(value, depth + 1)
  } else if (node.type === 'list') {
    for (const item of node.items) yield* compounds(item, depth + 1)
  }
}

const stringAt = (entries, ...names) => {
  for (const name of names) {
    const value = entries.get(name)
    if (value?.type === 'string') return value.value
  }
  return null
}

function schematicFormat(root) {
  const entries = root.entries
  const has = (name) => entries.has(name)
  if (has('Regions') && (has('Metadata') || has('MinecraftDataVersion'))) return 'Litematica'
  if (entries.get('Schematic')?.type === 'compound' || (has('Palette') && has('BlockData'))) return 'Sponge schematic (WorldEdit)'
  if (has('Blocks') && has('Data') && has('TileEntities')) return 'WorldEdit legacy schematic'
  if (has('size') && has('blocks') && has('palette')) return 'Minecraft structure (.nbt)'
  return 'NBT data'
}

export function inspectSchematic(parsed) {
  const commands = []
  const dangerous = []
  let commandBlockCount = 0

  for (const entries of compounds(parsed.root)) {
    const id = stringAt(entries, 'id', 'Id')
    if (id !== null && /command_block/.test(id.toLowerCase())) commandBlockCount++

    const command = stringAt(entries, 'Command', 'command')
    if (command !== null && command.trim() !== '') {
      commands.push(command)
      const why = whyDangerous(command)
      if (why !== null) dangerous.push({ command, why })
      continue
    }
    for (const value of entries.values()) {
      if (value.type !== 'string') continue
      const clickable = clickableCommand(value.value)
      if (clickable === null) continue
      const why = whyDangerous(clickable)
      if (why === null) continue
      const reason = `offers a clickable button that ${why}`
      if (!dangerous.some((entry) => entry.why === reason)) dangerous.push({ command: clickable, why: reason })
    }
  }

  return { format: schematicFormat(parsed.root), commands, dangerous, commandBlockCount }
}

export const SCHEMATIC_EXTENSIONS = ['.litematic', '.schem', '.schematic', '.nbt']
export const namedLikeSchematic = (fileName) => {
  const lower = fileName.toLowerCase()
  return SCHEMATIC_EXTENSIONS.some((extension) => lower.endsWith(extension))
}
