/**
 * The rules. Each one turns something read out of the file into one of the
 * behaviour categories in catalog.js.
 *
 * The rules are deliberately narrow. "Uses reflection" is not a rule, because
 * every mixin-shaped mod does; "reaches Runtime.exec by a name it assembled at
 * runtime" is, because nothing else does. The same goes for `setAccessible`,
 * which appears here only as the gate on the hidden-name check — a performance
 * mod prying a private field open is not a finding, and treating it as one is
 * how a scanner ends up flagging half of CurseForge.
 */

import { asText } from './archive.js'
import { matchCampaigns } from './campaigns.js'
import { spawnCallSites, stringsBuiltFromArrays } from './classfile.js'
import { entropyBlobs, hiddenStrings } from './obfuscation.js'
import { analyseCommandLine, categoryForCommandLine, describeCommandLine } from './process.js'
import {
  BLOCKCHAIN_RPC,
  CHAT_PACKET_NAMES,
  CHAT_SEND_METHODS,
  COMPRESSION_CLASSES,
  DEFENDER_TOKENS,
  DROP_METHODS,
  FILE_CLASSES,
  FILE_READ_CLASSES,
  FILE_READ_METHODS,
  FILE_WRITE_CLASSES,
  FILE_WRITE_METHODS,
  GENERIC_MOD_IDS,
  HARDCODED_COMMANDS,
  INDIRECT_LOADER_CLASSES,
  INSTRUMENTATION_CLASSES,
  INVENTORY_METHODS,
  INVENTORY_OWNER,
  ITEM_PACKET_NAMES,
  JAVA_AGENT_FLAG,
  JAVA_TOOL_OPTIONS,
  LAUNCH_COMMAND_LINE,
  LAUNCH_CONFIG_NAMES,
  MINECRAFT_PRESENCE_MARKERS,
  NATIVE_EXTENSIONS,
  NETWORK_CLASSES,
  OUTSIDE_PATHS,
  PERSISTENCE,
  PLAYER_OWNER,
  PROCESS_BUILDER_CLASSES,
  PROGRAM_EXTENSIONS,
  REFLECTION_METHODS,
  REFLECTION_TARGETS,
  SANDBOX_MARKERS,
  SENSITIVE_FILES,
  SIGNATURE_FILE_TARGETS,
  SIGNATURE_STRIP_METHODS,
  SIGNATURE_VERIFY_CLASSES,
  TEMP_FILE_MARKERS,
  URL_FETCH_METHODS,
  UNSAFE_CLASSES,
  classifyHost,
  describeIntermediary,
  extractHosts,
  extractUrls,
  isChatPacket,
  isItemPacket,
  isModLoadingPackage,
  isRoutineUnsafeUse,
  publicIpAddress,
  readsAccountIdentity,
  readsSessionToken,
  sendsOneLineOfText,
  sendsPacket,
  WEBHOOK_ENDPOINTS,
} from './patterns.js'

const dotted = (name) => name.replace(/\//g, '.')
const clip = (text, length = 90) => (text.length <= length ? text : `${text.slice(0, length)}…`)

const localityKey = (origin) => {
  if (origin === null) return null
  if (origin.kind === 'bundled-library' && origin.owner !== null) return `lib:${origin.owner}`
  if (origin.kind === 'nested-jar' && origin.allowsSofterReading && origin.owner !== null) return `lib:jar:${origin.owner}`
  return null
}

class Findings {
  constructor() {
    this.byCategory = new Map()
    this.fromOwnCode = new Set()
    // Which library, if any, each category's findings all came from. `complete`
    // stays true only while every finding in the category has a library to name.
    this.byLocality = new Map()
  }
  add(category, evidence, origin = null) {
    let lines = this.byCategory.get(category)
    if (lines === undefined) {
      lines = new Set()
      this.byCategory.set(category, lines)
    }
    if (lines.has(evidence)) return
    lines.add(evidence)

    const borrowed = origin !== null && origin.allowsSofterReading && origin.kind !== 'mod-own'
    if (!borrowed) this.fromOwnCode.add(category)

    let locality = this.byLocality.get(category)
    if (locality === undefined) {
      locality = { keys: new Set(), complete: true }
      this.byLocality.set(category, locality)
    }
    const key = localityKey(origin)
    if (key === null) locality.complete = false
    else locality.keys.add(key)
  }
  has(category) {
    return this.byCategory.has(category)
  }
  localities() {
    return this.byLocality
  }
  toList() {
    const findings = []
    for (const [category, lines] of this.byCategory) {
      findings.push({
        category,
        evidence: [...lines].slice(0, 8),
        libraryOnly: !this.fromOwnCode.has(category),
      })
    }
    return findings
  }
}

// --- per-class rules --------------------------------------------------------

const OBJECT_INPUT_STREAM = 'java/io/ObjectInputStream'
const NETWORK_BUFFER_HINTS = ['io/netty/buffer/ByteBuf', 'net/minecraft/network', 'FriendlyByteBuf', 'PacketBuffer']

const usesNetwork = (cls) =>
  cls.methodRefs.some(
    (ref) =>
      (ref.owner === 'java/net/URL' && ref.name === '<init>') ||
      (ref.owner === 'java/net/URI' && (ref.name === 'toURL' || ref.name === 'create')) ||
      NETWORK_CLASSES.has(ref.owner),
  ) ||
  cls.referencedClasses.some((name) => NETWORK_CLASSES.has(name)) ||
  cls.stringConstants.some((value) => /^\s*(https?|ftp):\/\//i.test(value))

const usesReflection = (cls) =>
  cls.methodRefs.some((ref) =>
    REFLECTION_METHODS.some((entry) => entry.owner === ref.owner && entry.names.includes(ref.name)),
  ) || cls.methodRefs.some((ref) => ref.name === 'setAccessible')

/**
 * Can this class put a line of text into the server as you? It gates the
 * command fragments that mean nothing on their own — a constant reading "pay "
 * is a word until it sits next to the machinery that sends it.
 */
const typesIntoChat = (cls) =>
  cls.methodRefs.some(
    (ref) =>
      sendsOneLineOfText(ref) ||
      sendsPacket(ref) ||
      CHAT_SEND_METHODS.some((entry) => entry.owner.test(ref.owner) && entry.names.includes(ref.name)),
  ) ||
  cls.referencedClasses.some(
    (name) => CHAT_PACKET_NAMES.includes(name.split('/').at(-1) ?? name) || isChatPacket(name),
  )

const buildsInstanceOf = (cls, owner) => {
  const descriptor = `L${owner};`
  return (
    cls.methodRefs.some((ref) => ref.owner === owner && (ref.name === '<init>' || ref.descriptor.endsWith(`)${descriptor}`))) ||
    cls.fieldRefs.some((ref) => ref.owner === owner && ref.descriptor === descriptor)
  )
}

function extraAccess(cls, findings, origin) {
  const name = dotted(cls.className)
  const note = origin.note
  for (const referenced of cls.referencedClasses) {
    const meaning = INSTRUMENTATION_CLASSES.get(referenced)
    if (meaning !== undefined) findings.add('ASKS_EXTRA_ACCESS', `${name} ${meaning}${note}`, origin)
  }
  for (const ref of cls.methodRefs) {
    if (ref.owner === 'java/lang/System' && ref.name === 'setSecurityManager') {
      findings.add('ASKS_EXTRA_ACCESS', `${name} changes Java's security settings (System.setSecurityManager)${note}`, origin)
    }
  }

  const unsafeClasses = cls.referencedClasses.filter((referenced) => UNSAFE_CLASSES.has(referenced))
  if (unsafeClasses.length === 0) return
  const unsafeCalls = cls.methodRefs.filter((ref) => UNSAFE_CLASSES.has(ref.owner))
  const beyondMemory = unsafeCalls.filter((ref) => !isRoutineUnsafeUse(ref.name))
  if (beyondMemory.length > 0) {
    const names = [...new Set(beyondMemory.map((ref) => ref.name))].slice(0, 4).join(', ')
    findings.add(
      'ASKS_EXTRA_ACCESS',
      `${name} uses the unsafe runtime APIs for more than memory work (${dotted(unsafeClasses[0] ?? '')}.${names})${note}`,
      origin,
    )
    return
  }
  // Naming Unsafe and never calling it is its own kind of opaque.
  if (unsafeCalls.length === 0) {
    findings.add(
      'ASKS_EXTRA_ACCESS',
      `${name} reaches for ${dotted(unsafeClasses[0] ?? '')} without ModGuard being able to see what it does with it${note}`,
      origin,
    )
  }
}

function inGameActions(cls, findings, origin) {
  const name = dotted(cls.className)
  const note = origin.note

  for (const ref of cls.methodRefs) {
    for (const entry of CHAT_SEND_METHODS) {
      if (entry.owner.test(ref.owner) && entry.names.includes(ref.name)) {
        findings.add('ACTS_AS_YOU_IN_GAME', `${name} sends chat or commands to the server as you (${dotted(ref.owner)}.${ref.name})${note}`, origin)
      }
    }
    if (sendsOneLineOfText(ref)) {
      findings.add('ACTS_AS_YOU_IN_GAME', `${name} types chat or a command into the server as you (${dotted(ref.owner)}.${ref.name})${note}`, origin)
    }
  }

  const handedOver = cls.methodRefs.some(sendsPacket) ? ' and hands it to the server' : ''
  for (const referenced of cls.referencedClasses) {
    const simple = referenced.split('/').at(-1) ?? referenced
    const chat = CHAT_PACKET_NAMES.includes(simple) || isChatPacket(referenced)
    const items = ITEM_PACKET_NAMES.includes(simple) || isItemPacket(referenced)
    if ((!chat && !items) || !buildsInstanceOf(cls, referenced)) continue
    const described = describeIntermediary(referenced)
    const label = described === null ? dotted(referenced) : `${dotted(referenced)} — ${described}`
    if (chat) findings.add('ACTS_AS_YOU_IN_GAME', `${name} builds a chat/command packet${handedOver} as you (${label})${note}`, origin)
    if (items) findings.add('MOVES_YOUR_ITEMS', `${name} builds a packet that moves items in your inventory${handedOver} (${label})${note}`, origin)
  }

  for (const ref of cls.methodRefs) {
    if (INVENTORY_OWNER.test(ref.owner) && INVENTORY_METHODS.includes(ref.name)) {
      findings.add('MOVES_YOUR_ITEMS', `${name} moves items in your inventory (${dotted(ref.owner)}.${ref.name})${note}`, origin)
    }
    if (PLAYER_OWNER.test(ref.owner) && DROP_METHODS.includes(ref.name) && ref.descriptor.startsWith('(Z)')) {
      findings.add('MOVES_YOUR_ITEMS', `${name} drops what you are holding onto the ground (${dotted(ref.owner)}.${ref.name})${note}`, origin)
    }
  }
}

const CLASS_LOADER_NAMES = /ClassLoader$/
const BYTECODE_SOURCES = new Set([
  'java/util/jar/JarInputStream',
  'java/util/zip/ZipInputStream',
  'java/util/jar/JarFile',
  'java/util/zip/ZipFile',
])

/**
 * The behaviours that published campaigns are actually built out of.
 *
 * Each one is written to need the whole shape rather than any single API, because
 * every API involved has an honest user: Mixin subclasses ClassLoader, spark
 * loads a native profiler, a server-list mod reads servers.dat. What none of them
 * do is the combination.
 */
function campaignBehaviours(cls, findings, origin, context) {
  const name = dotted(cls.className)
  const note = origin.note
  const referenced = new Set(cls.referencedClasses)
  const { network, loadsCodeIndirectly, readsSession, corroborated } = context
  const isLoaderLibrary = isModLoadingPackage(cls.className)

  // 1. A string assembled out of a byte array, feeding something that loads code.
  //    In a static initialiser it runs the moment the class is touched, which is
  //    how a loader hides its address from anyone reading the strings.
  // The bytecode walk is the expensive part, so it only runs for the classes
  // where its answer could matter.
  if (!isLoaderLibrary && loadsCodeIndirectly) {
    const built = stringsBuiltFromArrays(cls)
    if (built.length > 0) {
      const inStaticInit = built.filter((site) => site.isStaticInitialiser)
      findings.add(
        'HIDES_ITS_CODE',
        inStaticInit.length > 0
          ? `${name} builds its text out of raw byte arrays in a static initialiser — code that runs the moment the class is touched — and the same class loads code at runtime${note}`
          : `${name} builds its text out of raw byte arrays rather than writing it down, in a class that also loads code at runtime (in ${built[0]?.from ?? '?'}())${note}`,
        origin,
      )
      findings.add(
        'INDIRECT_CODE_LOADING',
        `${name} loads code whose address is assembled at runtime rather than written in the file${note}`,
        origin,
      )
    }
  }

  // 2. Who you are, next to something that would carry it away. Reading your name
  //    is ordinary; reading it in a file that is already taking your session or
  //    your logins is part of the same collection.
  if (readsSession || context.readsCredentialFiles) {
    const identity = cls.methodRefs.filter(readsAccountIdentity)
    if (identity.length > 0) {
      findings.add(
        'READS_YOUR_SESSION',
        `${name} also reads your account name and id (${dotted(identity[0]?.owner ?? '')}.${identity[0]?.name ?? ''})${note}`,
        origin,
      )
    }
  }

  // 3. A classloader of its own that takes bytecode from the network or from
  //    bytes inside the jar, rather than from the classpath.
  if (!isLoaderLibrary) {
    const isClassLoader =
      (cls.superClassName !== null && CLASS_LOADER_NAMES.test(cls.superClassName)) ||
      cls.interfaces.some((entry) => CLASS_LOADER_NAMES.test(entry))
    const definesClasses = cls.methodRefs.some((ref) => ref.name === 'defineClass')
    const fromBytes =
      cls.referencedClasses.some((referencedName) => BYTECODE_SOURCES.has(referencedName)) ||
      cls.methodRefs.some((ref) => ref.name === 'getResourceAsStream')
    if ((isClassLoader || definesClasses) && (network || fromBytes)) {
      findings.add(
        'INDIRECT_CODE_LOADING',
        `${name} is a classloader of its own that takes bytecode from ${network ? 'the network' : 'bytes stored inside the jar'} rather than from the game's own classpath${note}`,
        origin,
      )
    }
  }

  // 4. Unpacking bytes to a temporary file and loading them as native code.
  const loadsNative = cls.methodRefs.some(
    (ref) => (ref.owner === 'java/lang/System' || ref.owner === 'java/lang/Runtime') && (ref.name === 'load' || ref.name === 'loadLibrary'),
  )
  if (loadsNative) {
    const toTemp = cls.stringConstants.some((constant) => TEMP_FILE_MARKERS.some((marker) => marker.test(constant))) ||
      cls.methodRefs.some((ref) => ref.name === 'createTempFile')
    const writesFile =
      cls.referencedClasses.some((referencedName) => FILE_WRITE_CLASSES.has(referencedName)) ||
      cls.methodRefs.some((ref) => ref.owner === 'java/nio/file/Files' && FILE_WRITE_METHODS.has(ref.name))
    const compressed = cls.referencedClasses.some((referencedName) => COMPRESSION_CLASSES.has(referencedName))
    // Unpacking a bundled native to a temp file and loading it is what LWJGL and
    // every mod that ships a native does, so the extraction itself says nothing.
    // What says something is where the bytes came from: fetched while the game
    // runs, or squeezed through a compressor so the file cannot be read as it
    // sits. Neither is how an honest native ships.
    const opaqueSource = network || compressed
    if (toTemp && writesFile && opaqueSource && origin.kind !== 'bundled-library') {
      const source = network ? 'fetched while the game runs' : 'unpacked from compressed bytes rather than shipped as a plain library'
      findings.add(
        'LOADS_NATIVE_CODE',
        `${name} writes a native library to a temporary file, ${source}, and loads it — code that runs outside Java with no sandbox around it${note}`,
        origin,
      )
      findings.add(
        'HIDES_ITS_CODE',
        `${name} carries the native code it runs in a form that cannot be read from the file as it sits (${network ? 'fetched at runtime' : 'compressed'})${note}`,
        origin,
      )
    }
  }

  // 5. Telling the antivirus to look away. Read from the strings as well as from
  //    a command line, because the command is often assembled a piece at a time.
  for (const constant of cls.stringConstants) {
    for (const { token, says } of DEFENDER_TOKENS) {
      if (token.test(constant)) {
        findings.add('DISABLES_YOUR_PROTECTION', `${name} ${says} ("${clip(constant, 70)}")${note}`, origin)
      }
    }
  }

  // 6. Deleting the files that prove a jar has not been altered.
  const deletes = cls.methodRefs.some(
    (ref) =>
      SIGNATURE_STRIP_METHODS.has(ref.name) &&
      (FILE_CLASSES.has(ref.owner) || ref.owner === 'java/nio/file/Files' || ref.owner.includes('Zip') || ref.owner.includes('Jar')),
  )
  for (const constant of cls.stringConstants) {
    for (const entry of SIGNATURE_FILE_TARGETS) {
      if (!entry.pattern.test(constant)) continue
      findings.add(
        'STRIPS_CODE_SIGNATURES',
        `${name} ${deletes ? 'deletes' : 'singles out'} ${entry.describe} ("${clip(constant, 60)}") — what is removed to stop a tampered jar looking tampered with${note}`,
        origin,
      )
    }
  }

  // 8. Orders read off a blockchain, checked against a key only the operator has.
  const verifiesSignature = cls.referencedClasses.some((referencedName) => SIGNATURE_VERIFY_CLASSES.has(referencedName))
  for (const constant of cls.stringConstants) {
    for (const entry of BLOCKCHAIN_RPC) {
      if (!entry.pattern.test(constant)) continue
      if (entry.requiresCorroboration === true && !(network && verifiesSignature)) continue
      findings.add(
        'USES_BLOCKCHAIN_C2',
        `${name} reads ${entry.describe} ("${clip(constant, 60)}")${verifiesSignature ? ', and checks the answer against a key built into the file' : ''} — a way to change where a mod takes its orders from without changing the mod${note}`,
        origin,
      )
    }
  }

  // 9. Deciding whether the machine is a real player's before doing anything.
  for (const constant of cls.stringConstants) {
    for (const entry of SANDBOX_MARKERS) {
      if (!entry.pattern.test(constant)) continue
      if (entry.requiresCorroboration === true && !corroborated) continue
      findings.add(
        'CHECKS_IF_IT_IS_WATCHED',
        `${name} looks for ${entry.describe} ("${clip(constant, 60)}") — a check that tells an analysis machine from a player's${note}`,
        origin,
      )
    }
  }
  // Gating behaviour on the game actually being present is the same check by
  // another route, and only means anything next to something worth gating.
  if (corroborated) {
    for (const constant of cls.stringConstants) {
      if (MINECRAFT_PRESENCE_MARKERS.some((marker) => marker.test(constant))) {
        findings.add(
          'CHECKS_IF_IT_IS_WATCHED',
          `${name} checks that the game is really installed before going further ("${clip(constant, 60)}") — which is also how a file avoids acting inside a sandbox that has no Minecraft in it${note}`,
          origin,
        )
        break
      }
    }
  }
}

function analyseClass(unit, findings, hidesItsCode) {
  const { cls, origin } = unit
  const name = dotted(cls.className)
  const note = origin.note
  const referenced = new Set(cls.referencedClasses)
  const chatSender = typesIntoChat(cls)

  // A hole rather than an intent: deserialising network data into live objects.
  // This is the BleedingPipe shape, and it needs no second signal — rebuilding
  // objects out of anything a stranger can send is a way in by itself.
  if (referenced.has(OBJECT_INPUT_STREAM) && cls.methodRefs.some((ref) => ref.owner === OBJECT_INPUT_STREAM && ref.name === 'readObject')) {
    const alongside = cls.referencedClasses.find((other) => NETWORK_BUFFER_HINTS.some((hint) => other.includes(hint)))
    const overASocket = cls.referencedClasses.some((other) => NETWORK_CLASSES.has(other))
    if (alongside !== undefined || overASocket) {
      const where = alongside !== undefined ? dotted(alongside) : 'a network socket'
      findings.add(
        'HAS_A_HOLE_SOMEBODY_COULD_USE',
        `${name} rebuilds Java objects out of data that arrived over the network (${where}) — whoever sends the data chooses which code runs${note}`,
        origin,
      )
    }
  }

  for (const referencedName of cls.referencedClasses) {
    if (NETWORK_CLASSES.has(referencedName)) {
      findings.add('REACHES_INTERNET', `${name} opens network connections (${dotted(referencedName)})${note}`, origin)
    }
    if (INDIRECT_LOADER_CLASSES.has(referencedName)) {
      findings.add('INDIRECT_CODE_LOADING', `${name} loads code at runtime (${dotted(referencedName)})${note}`, origin)
    }
  }

  const network = usesNetwork(cls)
  for (const ref of cls.methodRefs) {
    if (ref.owner === 'java/net/URL' && URL_FETCH_METHODS.has(ref.name) && network) {
      findings.add('REACHES_INTERNET', `${name} makes web requests (java.net.URL.${ref.name})${note}`, origin)
    }
    if (ref.name === 'defineClass' && referenced.has('java/lang/ClassLoader')) {
      findings.add('INDIRECT_CODE_LOADING', `${name} builds new classes in memory (ClassLoader.defineClass)${note}`, origin)
    }
    if (readsSessionToken(ref)) {
      findings.add('READS_YOUR_SESSION', `${name} reads your Minecraft session token (${dotted(ref.owner)}.${ref.name})${note}`, origin)
    }
    if ((ref.owner === 'java/lang/System' || ref.owner === 'java/lang/Runtime') && (ref.name === 'loadLibrary' || ref.name === 'load')) {
      findings.add('LOADS_NATIVE_CODE', `${name} loads a native library (${dotted(ref.owner)}.${ref.name})${note}`, origin)
    }
  }

  const touchesFiles =
    cls.referencedClasses.some((referencedName) => FILE_CLASSES.has(referencedName)) ||
    cls.methodRefs.some((ref) => FILE_CLASSES.has(ref.owner))
  const readsFiles =
    cls.referencedClasses.some((referencedName) => FILE_READ_CLASSES.has(referencedName)) ||
    cls.methodRefs.some((ref) => ref.owner === 'java/nio/file/Files' && FILE_READ_METHODS.has(ref.name))

  // What else in this class could carry something off the machine. It is the
  // gate on the entries that are ordinary on their own — your server list is
  // your server list until it is being read next to a socket.
  const loadsCodeIndirectly =
    cls.referencedClasses.some((referencedName) => INDIRECT_LOADER_CLASSES.has(referencedName)) ||
    cls.methodRefs.some((ref) => ref.name === 'defineClass')
  const readsSession = cls.methodRefs.some(readsSessionToken)
  const corroborated = network || loadsCodeIndirectly || readsSession
  let readsCredentialFiles = false

  for (const constant of cls.stringConstants) {
    for (const entry of SENSITIVE_FILES) {
      if (!entry.pattern.test(constant)) continue
      if (entry.requiresRead === true && !readsFiles) continue
      if (entry.requiresCorroboration === true && !corroborated) continue
      readsCredentialFiles = true
      findings.add('TOUCHES_SENSITIVE_FILES', `${name} references ${entry.describe} ("${clip(constant, 60)}")${note}`, origin)
    }
    if (touchesFiles) {
      for (const entry of OUTSIDE_PATHS) {
        if (entry.pattern.test(constant)) {
          findings.add('TOUCHES_OUTSIDE_FILES', `${name} works with ${entry.describe} ("${clip(constant, 60)}")${note}`, origin)
        }
      }
    }
    for (const entry of PERSISTENCE) {
      if (!entry.pattern.test(constant)) continue
      if (entry.requiresCorroboration === true && !(corroborated || touchesFiles)) continue
      findings.add('STARTS_AUTOMATICALLY', `${name} references ${entry.describe} ("${clip(constant, 60)}")${note}`, origin)
    }
    for (const entry of HARDCODED_COMMANDS) {
      if (entry.requiresChatSend === true && !chatSender) continue
      if (entry.pattern.test(constant.trim())) {
        findings.add(entry.category, `${name} contains ${entry.describe} ("${clip(constant, 60)}")${note}`, origin)
      }
    }
  }

  if (
    touchesFiles &&
    cls.methodRefs.some((ref) => ref.owner === 'java/lang/System' && ref.name === 'getenv') &&
    cls.stringConstants.some((constant) => /APPDATA|USERPROFILE|HOME/.test(constant))
  ) {
    findings.add('TOUCHES_OUTSIDE_FILES', `${name} locates user folders through environment variables${note}`, origin)
  }

  extraAccess(cls, findings, origin)
  inGameActions(cls, findings, origin)
  campaignBehaviours(cls, findings, origin, {
    network,
    loadsCodeIndirectly,
    readsSession,
    readsCredentialFiles,
    corroborated,
  })

  // Strings written in a form meant not to be read, and what they turned out to say.
  for (const hidden of hiddenStrings(cls.stringConstants)) {
    findings.add('HIDES_ITS_CODE', `${name} hides ${hidden.method}: "${clip(hidden.decoded, 70)}"${note}`, origin)
    for (const entry of SENSITIVE_FILES) {
      if (entry.pattern.test(hidden.decoded)) {
        findings.add('TOUCHES_SENSITIVE_FILES', `${name} references ${entry.describe}, hidden in its code ("${clip(hidden.decoded, 50)}")${note}`, origin)
      }
    }
    for (const entry of HARDCODED_COMMANDS) {
      if (entry.requiresChatSend === true && !chatSender) continue
      if (entry.pattern.test(hidden.decoded.trim())) {
        findings.add(entry.category, `${name} hides ${entry.describe} ("${clip(hidden.decoded, 50)}")${note}`, origin)
      }
    }
    for (const entry of PERSISTENCE) {
      if (entry.pattern.test(hidden.decoded)) {
        findings.add('STARTS_AUTOMATICALLY', `${name} hides ${entry.describe} ("${clip(hidden.decoded, 50)}")${note}`, origin)
      }
    }
  }

  const blobs = entropyBlobs(cls.stringConstants)
  if (blobs.length > 0) {
    findings.add(
      'HIDES_ITS_CODE',
      `${name} carries ${blobs.length} long, high-entropy text constants with no readable content — the shape of an encoded payload${note}`,
      origin,
    )
  }

  // Decrypting data at runtime, unless the class is plainly doing signature work.
  const usesCipher = referenced.has('javax/crypto/Cipher')
  const decodesBase64 = cls.methodRefs.some((ref) => ref.owner.startsWith('java/util/Base64') && ref.name === 'decode')
  const verifiesSignatures =
    referenced.has('java/security/spec/X509EncodedKeySpec') ||
    cls.methodRefs.some((ref) => ref.owner === 'java/security/KeyFactory' && ref.name === 'generatePublic')
  if (usesCipher && decodesBase64 && !verifiesSignatures) {
    findings.add('HIDES_ITS_CODE', `${name} decodes and decrypts hidden data while running${note}`, origin)
  }

  // Starting a program: the three tiers.
  for (const site of spawnCallSites(cls)) {
    const analysis = analyseCommandLine(site.argv)
    if (analysis.disablesProtection !== null) {
      findings.add('DISABLES_YOUR_PROTECTION', `${name} ${analysis.disablesProtection} ("${clip(analysis.commandLine)}")${note}`, origin)
    }
    const category = categoryForCommandLine(analysis, origin.allowsSofterReading, hidesItsCode)
    findings.add(category, `${name} ${describeCommandLine(analysis)} — seen at ${site.api} in ${site.methodName}()${note}`, origin)
  }
  // ProcessBuilder named but never given a readable command line.
  if (
    cls.referencedClasses.some((referencedName) => PROCESS_BUILDER_CLASSES.has(referencedName)) &&
    !cls.methodRefs.some((ref) => PROCESS_BUILDER_CLASSES.has(ref.owner))
  ) {
    findings.add('RUNS_OTHER_PROGRAMS', `${name} names java.lang.ProcessBuilder without ModGuard being able to see what it starts${note}`, origin)
  }

  // Reaching a dangerous class by a name the file never spells out.
  if (usesReflection(cls)) {
    const spelled = new Set(cls.stringConstants.map((constant) => constant.trim()))
    for (const hidden of hiddenStrings(cls.stringConstants)) spelled.add(hidden.decoded.trim())
    for (const target of REFLECTION_TARGETS) {
      for (const targetName of target.names) {
        if (!spelled.has(targetName) && !spelled.has(targetName.replace(/\./g, '/'))) continue
        findings.add(
          target.category,
          `${name} looks up ${targetName} by name at runtime — ${target.meaning}${note}`,
          origin,
        )
      }
    }
  }
}

// --- whole-archive rules ----------------------------------------------------

const SCRAMBLED_NAME = /^(?:[a-zA-Z]{1,2}|[Il1O0]{3,})$/
const simpleName = (className) => {
  const last = className.split('/').at(-1) ?? className
  return last.split('$')[0] ?? last
}

function endpoints(units) {
  const found = new Map()
  for (const { cls } of units) {
    const network = usesNetwork(cls)
    for (const constant of cls.stringConstants) {
      for (const url of extractUrls(constant)) found.set(url, 'string')
      if (constant.length < 120 && !/\s/.test(constant.trim())) {
        for (const host of extractHosts(constant)) found.set(host, 'string')
        if (network) {
          const address = publicIpAddress(constant)
          if (address !== null) found.set(address, 'string')
        }
      }
    }
  }
  return [...found.keys()]
}

function launcherInjection(archive, findings) {
  const MAX = 512 * 1024
  const seen = new Set()
  const add = (line) => {
    if (seen.has(line)) return
    seen.add(line)
    findings.add('INJECTS_AT_LAUNCH', line, null)
  }
  for (const entry of archive.entries) {
    const base = entry.path.split(/[\\/]/).at(-1)?.toLowerCase() ?? ''
    const isLaunchConfig = LAUNCH_CONFIG_NAMES.has(base) || base.endsWith('profiles.json')
    if (!isLaunchConfig || entry.data.byteLength > MAX) continue
    const text = asText(entry.data)
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (line === '' || line.startsWith('#')) continue
      if (JAVA_AGENT_FLAG.test(line)) add(`${entry.path} loads code into the game: ${clip(line, 120)}`)
      else if (JAVA_TOOL_OPTIONS.test(line)) add(`${entry.path} sets a Java option that injects into every launch: ${clip(line, 120)}`)
    }
    LAUNCH_COMMAND_LINE.lastIndex = 0
    for (const match of text.matchAll(LAUNCH_COMMAND_LINE)) {
      add(`${entry.path} runs a command around the launch — ${match[1]}=${clip(match[2] ?? '', 120)}`)
    }
  }
}

/**
 * Everything the code, the archive and the pack configuration say about what
 * this file does.
 */
export function detectBehaviours({ archive, manifest, units, unreadableClassPaths, nestedJars }) {
  const findings = new Findings()

  // An undeclared jar-in-jar is code the description file never mentions.
  for (const nested of nestedJars) {
    if (nested.declared) continue
    const contents =
      nested.classes.length > 0
        ? `${nested.classes.length} code ${nested.classes.length === 1 ? 'file' : 'files'}`
        : 'no readable code files, so ModGuard cannot say what is in it'
    findings.add('HIDES_ITS_CODE', `The archive carries a whole jar of extra code at ${nested.path} that the mod's description file never mentions (${contents})`, null)
  }

  const allStrings = units.flatMap((unit) => unit.cls.stringConstants)
  const hosts = endpoints(units)

  for (const { campaign, matches, structural } of matchCampaigns({
    classNames: units.map((unit) => unit.cls.className),
    referencedClasses: units.flatMap((unit) => unit.cls.referencedClasses),
    strings: allStrings,
    entryPaths: archive.entries.map((entry) => entry.path),
    hosts,
  })) {
    const listed = matches.slice(0, 4).map((match) => `${match.found} (${match.site.replace('-', ' ')})`).join(', ')
    findings.add(
      'CARRIES_A_KNOWN_MALWARE_MARKER',
      structural
        ? `This archive is built out of published indicators for ${campaign.name} (${campaign.active}): ${listed}. ${campaign.what} Read the analysis at ${campaign.source}`
        : `This archive mentions published indicators for ${campaign.name} (${campaign.active}): ${listed}. Found as text, which a tool written to clean this campaign up would also carry — a reason to check where the file came from, not proof on its own. ${campaign.source}`,
      null,
    )
  }

  // Hidden code changes how a command line is read, so it is settled first.
  const hidesItsCode = units.some((unit) => hiddenStrings(unit.cls.stringConstants).length > 0)
  for (const unit of units) analyseClass(unit, findings, hidesItsCode)

  // A name that describes nothing, on a file that loads code it did not ship
  // with. Either half is unremarkable — plenty of small mods have plain names,
  // and mod loaders load code for a living — but a loader that also declined to
  // say what it is has made two choices in the same direction.
  const declaredId = (manifest.id ?? '').toLowerCase()
  if (GENERIC_MOD_IDS.has(declaredId) && findings.has('INDIRECT_CODE_LOADING')) {
    findings.add(
      'HIDES_ITS_CODE',
      `The mod calls itself "${manifest.id}", a name that says nothing about what it does, and loads code at runtime that is not in this file`,
      null,
    )
  }

  const ownClasses = units.filter((unit) => unit.origin.kind === 'mod-own' || unit.origin.kind === 'unattributed')
  if (ownClasses.length >= 4) {
    const scrambled = ownClasses.filter((unit) => SCRAMBLED_NAME.test(simpleName(unit.cls.className)))
    if (scrambled.length / ownClasses.length >= 0.5) {
      findings.add(
        'HIDES_ITS_CODE',
        `${scrambled.length} of ${ownClasses.length} code files use scrambled, unreadable names (e.g. "${simpleName(scrambled[0]?.cls.className ?? '?')}")`,
        null,
      )
    }
  }

  const totalClasses = units.length + unreadableClassPaths.length
  if (unreadableClassPaths.length > 0 && unreadableClassPaths.length / totalClasses > 0.2) {
    findings.add('HIDES_ITS_CODE', `${unreadableClassPaths.length} code files are malformed and could not be read — sometimes a sign of packing`, null)
  }

  // A mod whose classes declare methods and contain no Java at all has had its
  // code moved into a native library.
  let nativeOnlyClasses = 0
  let nativeMethods = 0
  let firstNativeOnly = null
  for (const { cls } of units) {
    const methods = cls.methods.filter((method) => method.name !== '<clinit>')
    if (methods.length === 0) continue
    const natives = methods.filter((method) => method.isNative)
    if (natives.length === 0 || methods.some((method) => method.code !== null)) continue
    nativeOnlyClasses++
    nativeMethods += natives.length
    firstNativeOnly ??= dotted(cls.className)
  }
  if (nativeOnlyClasses >= 5) {
    findings.add(
      'LOADS_NATIVE_CODE',
      `${nativeOnlyClasses} code files declare ${nativeMethods} methods and contain no Java at all (e.g. ${firstNativeOnly}) — what a mod looks like after a native obfuscator has moved its code out of the class files`,
      null,
    )
  }

  for (const entry of archive.entries) {
    const path = entry.path.toLowerCase()
    if (NATIVE_EXTENSIONS.some((extension) => path.endsWith(extension))) {
      findings.add('LOADS_NATIVE_CODE', `The archive ships a native library: ${entry.path}`, null)
    }
    if (PROGRAM_EXTENSIONS.some((extension) => path.endsWith(extension))) {
      findings.add('CARRIES_A_PROGRAM', `The archive carries a program or script the game would never load: ${entry.path}`, null)
    }
  }

  if (manifest.declaresJavaAgent) {
    findings.add('ACTS_AS_JAVA_AGENT', 'The jar manifest declares a Java agent (Premain-Class / Agent-Class), letting it rewrite other code as it loads', null)
  }

  launcherInjection(archive, findings)

  return {
    findings: findings.toList(),
    localities: findings.localities(),
    endpoints: hosts.map((host) => ({ host, ...classifyHost(host) })),
  }
}

export { WEBHOOK_ENDPOINTS }
