/**
 * A Java class-file reader: constant pool, members, and a bytecode walker.
 *
 * Everything the detection rules ask about a class — which classes it names,
 * which methods it calls, which strings it carries — comes from the constant
 * pool, which is exactly what the desktop app reads. The bytecode walk is the
 * one place this build is simpler than the app: the app runs an abstract
 * interpreter over each method to follow a value to the call that uses it,
 * where this reads the string constants a method loads before it calls out.
 * That is enough to tell a named program from an unreadable one, which is what
 * the RUNS_* split turns on.
 */

export class ClassFileError extends Error {}

const utf8 = new TextDecoder('utf-8', { fatal: false })

class Reader {
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.bytes = bytes
    this.at = 0
  }
  u1() {
    if (this.at + 1 > this.bytes.length) throw new ClassFileError('Truncated class file.')
    return this.view.getUint8(this.at++)
  }
  u2() {
    if (this.at + 2 > this.bytes.length) throw new ClassFileError('Truncated class file.')
    const value = this.view.getUint16(this.at)
    this.at += 2
    return value
  }
  u4() {
    if (this.at + 4 > this.bytes.length) throw new ClassFileError('Truncated class file.')
    const value = this.view.getUint32(this.at)
    this.at += 4
    return value
  }
  raw(length) {
    if (this.at + length > this.bytes.length) throw new ClassFileError('Truncated class file.')
    const slice = this.bytes.subarray(this.at, this.at + length)
    this.at += length
    return slice
  }
}

// Array descriptors and primitives are not classes anyone can reason about.
function normaliseClassName(raw) {
  let name = raw.replace(/^\[+/, '')
  if (name.startsWith('L') && name.endsWith(';')) name = name.slice(1, -1)
  if (name === '' || /^[BCDFIJSZV]$/.test(name)) return null
  return name
}

const ACC_NATIVE = 0x0100

export function parseClass(bytes) {
  const reader = new Reader(bytes)
  if (reader.u4() !== 0xcafebabe) throw new ClassFileError('Not a class file.')
  reader.u2() // minor
  const majorVersion = reader.u2()

  const count = reader.u2()
  const pool = new Array(count)
  for (let index = 1; index < count; index++) {
    const tag = reader.u1()
    switch (tag) {
      case 1: {
        const length = reader.u2()
        pool[index] = { tag, value: utf8.decode(reader.raw(length)) }
        break
      }
      case 3:
      case 4:
        reader.u4()
        pool[index] = { tag }
        break
      case 5:
      case 6:
        reader.u4()
        reader.u4()
        pool[index] = { tag }
        index++ // longs and doubles take two slots
        break
      case 7:
      case 8:
      case 16:
      case 19:
      case 20:
        pool[index] = { tag, nameIndex: reader.u2() }
        break
      case 9:
      case 10:
      case 11:
        pool[index] = { tag, classIndex: reader.u2(), nameAndTypeIndex: reader.u2() }
        break
      case 12:
        pool[index] = { tag, nameIndex: reader.u2(), descriptorIndex: reader.u2() }
        break
      case 15:
        pool[index] = { tag, referenceKind: reader.u1(), referenceIndex: reader.u2() }
        break
      case 17:
      case 18:
        pool[index] = { tag, bootstrapIndex: reader.u2(), nameAndTypeIndex: reader.u2() }
        break
      default:
        throw new ClassFileError(`Unknown constant pool tag ${tag}.`)
    }
  }

  const utf = (index) => {
    const entry = pool[index]
    if (entry === undefined || entry.tag !== 1) throw new ClassFileError('Expected a UTF-8 constant.')
    return entry.value
  }
  const className = (index) => {
    const entry = pool[index]
    if (entry === undefined || entry.tag !== 7) throw new ClassFileError('Expected a class constant.')
    return utf(entry.nameIndex)
  }

  const accessFlags = reader.u2()
  const thisClass = reader.u2()
  const superClass = reader.u2()
  const interfaceCount = reader.u2()
  const interfaces = []
  for (let i = 0; i < interfaceCount; i++) interfaces.push(className(reader.u2()))

  const readAttributes = () => {
    const attributes = []
    const total = reader.u2()
    for (let i = 0; i < total; i++) {
      const name = utf(reader.u2())
      const length = reader.u4()
      attributes.push({ name, data: reader.raw(length) })
    }
    return attributes
  }

  const fieldCount = reader.u2()
  for (let i = 0; i < fieldCount; i++) {
    reader.u2()
    reader.u2()
    reader.u2()
    readAttributes()
  }

  const methods = []
  const methodCount = reader.u2()
  for (let i = 0; i < methodCount; i++) {
    const flags = reader.u2()
    const name = utf(reader.u2())
    const descriptor = utf(reader.u2())
    let code = null
    for (const attribute of readAttributes()) {
      if (attribute.name !== 'Code' || code !== null) continue
      try {
        const inner = new Reader(attribute.data)
        inner.u2() // max stack
        inner.u2() // max locals
        code = inner.raw(inner.u4())
      } catch {
        code = null
      }
    }
    methods.push({ name, descriptor, accessFlags: flags, code, isNative: (flags & ACC_NATIVE) !== 0 })
  }
  readAttributes() // class attributes

  const referencedClasses = new Set()
  const stringConstants = []
  const methodRefs = []
  const fieldRefs = []

  for (const entry of pool) {
    if (entry === undefined) continue
    if (entry.tag === 7) {
      const name = normaliseClassName(utf(entry.nameIndex))
      if (name !== null) referencedClasses.add(name)
    } else if (entry.tag === 8) {
      stringConstants.push(utf(entry.nameIndex))
    } else if (entry.tag === 9 || entry.tag === 10 || entry.tag === 11) {
      const owner = normaliseClassName(className(entry.classIndex))
      const nameAndType = pool[entry.nameAndTypeIndex]
      if (owner === null || nameAndType === undefined || nameAndType.tag !== 12) continue
      const ref = {
        owner,
        name: utf(nameAndType.nameIndex),
        descriptor: utf(nameAndType.descriptorIndex),
      }
      if (entry.tag === 9) fieldRefs.push(ref)
      else methodRefs.push(ref)
    }
  }

  return {
    className: className(thisClass),
    superClassName: superClass === 0 ? null : className(superClass),
    interfaces,
    referencedClasses: [...referencedClasses],
    methodRefs,
    fieldRefs,
    stringConstants,
    methods,
    majorVersion,
    accessFlags,
    pool,
    utf,
  }
}

// --- bytecode walk ----------------------------------------------------------
// Instruction widths, so the walker lands on real opcodes rather than on bytes
// that happen to look like one.

const FIXED_WIDTH = new Map()
const width = (length, opcodes) => {
  for (const opcode of opcodes) FIXED_WIDTH.set(opcode, length)
}
width(2, [0x10, 0x12, 0x15, 0x16, 0x17, 0x18, 0x19, 0x36, 0x37, 0x38, 0x39, 0x3a, 0xa9, 0xbc])
width(3, [
  0x11, 0x13, 0x14, 0x84, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4,
  0xa5, 0xa6, 0xa7, 0xa8, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xbb, 0xbd, 0xc0, 0xc1, 0xc6,
  0xc7,
])
width(4, [0xc5])
width(5, [0xb9, 0xba, 0xc8, 0xc9])

const LDC = 0x12
const LDC_W = 0x13
const NEW = 0xbb

/**
 * Walks one method's code, yielding { op, index, pc } for the instructions that
 * carry a constant-pool index.
 *
 * The walk must not trust the bytes. A method it cannot decode is a method that
 * yields nothing further rather than one that reads the rest as garbage, and the
 * program counter is required to move forward every step — a switch table with a
 * negative count in it would otherwise walk backwards forever.
 */
function* walk(code) {
  const view = new DataView(code.buffer, code.byteOffset, code.byteLength)
  let pc = 0
  while (pc < code.length) {
    const op = code[pc]
    let next

    if (op === 0xc4) {
      next = pc + (code[pc + 1] === 0x84 ? 6 : 4) // wide
    } else if (op === 0xaa || op === 0xab) {
      // tableswitch / lookupswitch: padding to a 4-byte boundary, then a count
      let at = pc + 1
      while (at % 4 !== 0) at++
      if (at + 12 > code.length) return
      at += 4 // the default branch
      if (op === 0xaa) {
        const low = view.getInt32(at)
        const high = view.getInt32(at + 4)
        const count = high - low + 1
        if (count < 0 || count > code.length) return
        at += 8 + count * 4
      } else {
        const pairs = view.getInt32(at)
        if (pairs < 0 || pairs > code.length) return
        at += 4 + pairs * 8
      }
      next = at
    } else {
      const size = FIXED_WIDTH.get(op) ?? 1
      if (pc + size > code.length) return
      if (op === LDC) yield { op, index: code[pc + 1], pc }
      else if (op === LDC_W || op === 0x14) yield { op, index: (code[pc + 1] << 8) | code[pc + 2], pc }
      else if ((op >= 0xb6 && op <= 0xba) || op === NEW) yield { op, index: (code[pc + 1] << 8) | code[pc + 2], pc }
      next = pc + size
    }

    if (next <= pc || next > code.length) return
    pc = next
  }
}

/**
 * Every method call this class makes, tagged with the method it was made from.
 *
 * The constant pool says a class calls something; it cannot say from where. Some
 * findings turn on exactly that — a string assembled out of a byte array means
 * one thing in a decoder and another in a static initialiser that runs the
 * moment the class is touched — so this walks the code to attribute each call.
 */
export function callSites(cls) {
  const sites = []
  for (const method of cls.methods) {
    if (method.code === null) continue
    for (const instruction of walk(method.code)) {
      if (instruction.op < 0xb6 || instruction.op > 0xb9) continue
      const entry = cls.pool[instruction.index]
      if (entry === undefined || (entry.tag !== 10 && entry.tag !== 11)) continue
      try {
        const owner = normaliseClassName(cls.utf(cls.pool[entry.classIndex].nameIndex))
        if (owner === null) continue
        sites.push({
          from: method.name,
          isStaticInitialiser: method.name === '<clinit>',
          owner,
          name: cls.utf(cls.pool[entry.nameAndTypeIndex].nameIndex),
          descriptor: cls.utf(cls.pool[entry.nameAndTypeIndex].descriptorIndex),
        })
      } catch {
        /* a call we cannot read is not one we can claim to have read */
      }
    }
  }
  return sites
}

/** Strings built out of a byte or char array, and the method that built them. */
export function stringsBuiltFromArrays(cls) {
  return callSites(cls).filter(
    (site) =>
      site.owner === 'java/lang/String' &&
      site.name === '<init>' &&
      (site.descriptor.startsWith('([B') || site.descriptor.startsWith('([C')),
  )
}

const SPAWN_CALLS = [
  { owner: 'java/lang/Runtime', name: 'exec', api: 'java.lang.Runtime.exec' },
  { owner: 'java/lang/ProcessBuilder', name: '<init>', api: 'java.lang.ProcessBuilder' },
  { owner: 'java/lang/ProcessBuilder', name: 'command', api: 'java.lang.ProcessBuilder.command' },
]

/**
 * Every place this class starts a process, with the command line it was given.
 *
 * `argv` is the string constants the method pushed since its last call — the
 * approximation of the app's dataflow that this build makes. Constants a method
 * loaded for some earlier, unrelated call are not part of this command line, so
 * the run resets at every invocation; and `Runtime.exec(String)` splits on
 * whitespace at runtime, so a single constant is split the same way here.
 *
 * A call site with no readable constants is not an absence of the behaviour. It
 * is the "ModGuard could not tell what it runs" case, which is the heavier one.
 */
export function spawnCallSites(cls) {
  const sites = []
  for (const method of cls.methods) {
    if (method.code === null) continue
    let pending = []

    for (const instruction of walk(method.code)) {
      const entry = cls.pool[instruction.index]
      if (entry === undefined) continue

      if ((instruction.op === LDC || instruction.op === LDC_W) && entry.tag === 8) {
        try {
          pending.push(cls.utf(entry.nameIndex))
        } catch {
          /* a constant we cannot read is not one we can claim to have read */
        }
        continue
      }
      if (instruction.op < 0xb6 || instruction.op > 0xb9) continue
      if (entry.tag !== 10 && entry.tag !== 11) continue

      let owner
      let name
      let descriptor
      try {
        owner = normaliseClassName(cls.utf(cls.pool[entry.classIndex].nameIndex))
        name = cls.utf(cls.pool[entry.nameAndTypeIndex].nameIndex)
        descriptor = cls.utf(cls.pool[entry.nameAndTypeIndex].descriptorIndex)
      } catch {
        pending = []
        continue
      }

      const spawn = SPAWN_CALLS.find((call) => call.owner === owner && call.name === name)
      if (spawn === undefined) {
        pending = []
        continue
      }

      const singleString = descriptor.startsWith('(Ljava/lang/String;)')
      const argv = singleString && pending.length > 0
        ? (pending.at(-1) ?? '').split(/\s+/).filter((word) => word !== '')
        : [...pending]
      sites.push({ api: spawn.api, methodName: method.name, argv })
      pending = []
    }
  }
  return sites
}
