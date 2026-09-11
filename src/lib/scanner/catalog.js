/**
 * The behaviour catalogue, weights, combination rules and packaging model that
 * ModGuard 1.32.0 uses in dist/main/checker-worker.cjs, ported verbatim.
 *
 * The desktop app scores 28 behaviour categories. This browser build reaches
 * every one of them that can be decided from the file alone; RUNS_UNCHECKED_CODE
 * still needs the live sandbox to prove its data flow, and so does the
 * hash/reputation lookup. CHECKS_IF_IT_IS_WATCHED and HAS_A_HOLE_SOMEBODY_COULD_USE
 * are now decided statically here.
 *
 * Where this build has diverged from the app, and why:
 *   HAS_A_HOLE_SOMEBODY_COULD_USE  0 -> 35  it was scored at zero, so the finding
 *                                           was raised and then counted for
 *                                           nothing; BleedingPipe is a real way in
 *   DISABLES_YOUR_PROTECTION      45 -> 60  no mod has an honest reason to add a
 *                                           Defender exclusion, so it stands alone
 *   STARTS_AUTOMATICALLY          26 -> 32  likewise for autorun keys; it sat just
 *                                           under the band it belongs in
 *   ACTS_AS_JAVA_AGENT      now discounted  spark, authlib-injector and
 *                                           JvmDowngrader are all Java agents
 * and two categories are new: STRIPS_CODE_SIGNATURES and USES_BLOCKCHAIN_C2.
 * Re-sync these with the app before trusting the two scores to match.
 */

export const CATEGORIES = {
  REACHES_INTERNET: {
    weight: 12,
    title: 'Reaches out to the internet',
    plain: 'its code opens network connections or makes web requests',
  },
  RUNS_OTHER_PROGRAMS: {
    weight: 26,
    title: 'Tries to run other programs on your computer',
    plain: 'it can start programs or system commands, and the command could not be read',
  },
  RUNS_KNOWN_HELPER: {
    weight: 6,
    title: 'Asks your computer to do one ordinary job',
    plain: 'it runs a small built-in helper for one recognised job, like opening a link',
  },
  RUNS_A_PROGRAM_IT_NAMES: {
    weight: 18,
    title: 'Starts another program, and ModGuard read which one',
    plain: 'it starts another program, and the whole command was readable in its code',
  },
  TOUCHES_OUTSIDE_FILES: {
    weight: 22,
    title: "Touches files outside the mod's own area",
    plain: 'it reads or writes files outside the game folder, in system or user-profile paths',
  },
  INDIRECT_CODE_LOADING: {
    weight: 18,
    title: 'Loads code in indirect ways that can hide what it does',
    plain: 'it loads extra code at runtime in a roundabout way',
  },
  RUNS_UNCHECKED_CODE: {
    weight: 45,
    title: 'Runs code that was never in the file you checked',
    plain: 'it fetches more code while the game runs and hands it straight to the game',
  },
  LOADS_NATIVE_CODE: {
    weight: 24,
    title: 'Loads native code libraries',
    plain: "it loads native libraries that run outside Java's sandbox",
  },
  CARRIES_A_PROGRAM: {
    weight: 30,
    title: 'Carries a program inside it',
    plain: 'it packs a file your computer would run as a program in its own right',
  },
  CARRIES_A_KNOWN_MALWARE_MARKER: {
    weight: 45,
    title: 'Carries a name published as belonging to a known malware campaign',
    plain: 'it carries a name published as belonging to one particular malware campaign',
  },
  STARTS_AUTOMATICALLY: {
    // A mod is loaded by the game, so it never needs the machine to start it.
    // Naming an autorun key is enough on its own to be worth a second look.
    weight: 32,
    title: 'Sets itself to start automatically or stick around',
    plain: 'it references autorun keys, startup folders or scheduled tasks, which a mod has no reason to touch',
  },
  DISABLES_YOUR_PROTECTION: {
    // Nothing a mod legitimately does involves adding a Defender exclusion, so
    // this stands on its own rather than waiting for a second signal.
    weight: 60,
    title: 'Tells your antivirus to stop looking',
    plain: "it runs a command that switches off part of your computer's own protection",
  },
  HIDES_ITS_CODE: {
    weight: 28,
    title: 'Hides or scrambles its own code',
    plain: 'parts of it are deliberately made hard to read',
  },
  CHECKS_IF_IT_IS_WATCHED: {
    weight: 30,
    title: 'Checks whether it is being watched',
    plain: 'it compares your machine against the names analysis sandboxes use',
  },
  ASKS_EXTRA_ACCESS: {
    weight: 20,
    title: 'Asks for more access than a mod should need',
    plain: "it reaches into Java internals that normal mod code doesn't touch",
  },
  ACTS_AS_JAVA_AGENT: {
    weight: 30,
    title: 'Declares itself a Java agent',
    plain: "it can rewrite other code as that code loads — the game's, and other mods'",
  },
  INJECTS_AT_LAUNCH: {
    weight: 30,
    title: 'Tells your launcher to run extra code every time the game starts',
    plain: 'it changes launcher settings so extra code runs every time you press Play',
  },
  TOUCHES_SENSITIVE_FILES: {
    weight: 30,
    title: 'Reads files that hold logins or private data',
    plain: 'it names files that hold saved logins, browser passwords or wallet keys',
  },
  ACTS_AS_YOU_IN_GAME: {
    weight: 26,
    title: 'Can type into the game as you',
    plain: 'it can send chat or commands to the server under your name',
  },
  CARRIES_A_TRANSFER_COMMAND: {
    weight: 40,
    title: 'Carries a ready-made command that gives your money or things away',
    plain: 'a finished command that hands money or items to another player is written into its code',
  },
  MOVES_YOUR_ITEMS: {
    weight: 28,
    title: 'Can move items out of your inventory',
    plain: 'it can click slots, drop items, or work a chest or trade window for you',
  },
  READS_YOUR_SESSION: {
    weight: 20,
    title: 'Reads the key that proves you are you',
    plain: 'it reads your Minecraft session token',
  },
  HAS_A_HOLE_SOMEBODY_COULD_USE: {
    // A hole is not an intent, so this lands at "worth a closer look" on its own
    // rather than at "malicious": the mod is vulnerable, not hostile. It carries
    // weight without corroboration because the BleedingPipe pattern is a real
    // remote-code-execution route that needs no other signal to be exploitable.
    weight: 35,
    title: 'Has a weakness somebody else could use against you',
    plain: 'it rebuilds Java objects out of data that arrived over the network, which is a way in for whoever sends it',
  },
  STRIPS_CODE_SIGNATURES: {
    weight: 60,
    title: "Removes the signatures that prove a jar wasn't altered",
    plain: 'it deletes the signing files that would show a jar had been tampered with',
  },
  USES_BLOCKCHAIN_C2: {
    weight: 60,
    title: 'Takes its orders from the blockchain',
    plain: 'it reads its next instruction out of a blockchain contract and checks the answer against a built-in key',
  },
  PRETENDS_TO_BE_A_SCHEMATIC: {
    weight: 40,
    title: 'Is not the kind of file it claims to be',
    plain: 'it has a schematic’s name but its contents are a program archive',
  },
  HIDES_AN_EXECUTABLE: {
    weight: 60,
    title: 'Is a program disguised as a schematic',
    plain: 'its contents are a runnable program, not a saved build',
  },
  RUNS_COMMANDS_WHEN_PLACED: {
    weight: 12,
    title: 'Runs commands when you place it',
    plain: 'it holds command blocks that run under your name once the build is placed',
  },
  CARRIES_A_DANGEROUS_COMMAND: {
    weight: 40,
    title: 'Carries a command that can harm you when placed',
    plain: 'a command block in it carries a command a normal build has no reason to',
  },
  LOOKS_LIKE_A_BOMB: {
    weight: 34,
    title: 'Is built to crash whatever opens it',
    plain: 'it is built the way a decompression bomb is, to crash whatever reads it',
  },
}

// Packaging trust. A properly built mod earns a discount on the categories that
// are ordinary for one; a malformed or unrecognisable archive earns nothing.
export const PACKAGING = {
  verified: { level: 'verified', label: 'Verified package', trusted: true },
  valid: { level: 'valid', label: 'Valid mod package', trusted: true },
  unverified: { level: 'unverified', label: 'Not a recognised mod package', trusted: false },
  malformed: { level: 'malformed', label: 'Malformed package', trusted: false },
}

// Only these categories can ever be discounted, and only when nothing else in
// the file corroborates them.
const DISCOUNTABLE = [
  'REACHES_INTERNET',
  'TOUCHES_OUTSIDE_FILES',
  'INDIRECT_CODE_LOADING',
  'LOADS_NATIVE_CODE',
  'ASKS_EXTRA_ACCESS',
  'RUNS_KNOWN_HELPER',
  'ACTS_AS_YOU_IN_GAME',
  // A Java agent is how spark profiles the game, how authlib-injector redirects
  // authentication and how JvmDowngrader runs newer code on older Java. On its
  // own in a well-built mod it is a fact about packaging, not a finding; paired
  // with anything else here it stops being discounted and counts in full.
  'ACTS_AS_JAVA_AGENT',
]

const isDiscountable = (category) => DISCOUNTABLE.includes(category)
const isTrusted = (level) => level !== undefined && PACKAGING[level].trusted

// Weak signals that mean something specific together. `theftPattern` marks the
// pairs that lift the score cap, because they are complete attacks on their own.
export const COMBOS = [
  {
    categories: ['TOUCHES_SENSITIVE_FILES', 'REACHES_INTERNET'],
    extraWeight: 25,
    theftPattern: true,
    reason: 'Reads files that hold logins and also talks to the internet. That is the classic pattern of a mod that steals accounts.',
  },
  {
    categories: ['RUNS_OTHER_PROGRAMS', 'HIDES_ITS_CODE'],
    extraWeight: 20,
    reason: 'Runs other programs while hiding its own code. That is a common way malware installs itself without being noticed.',
  },
  {
    categories: ['REACHES_INTERNET', 'HIDES_ITS_CODE'],
    extraWeight: 15,
    reason: 'Talks to the internet with code it deliberately makes hard to read.',
  },
  {
    categories: ['INDIRECT_CODE_LOADING', 'REACHES_INTERNET'],
    extraWeight: 15,
    reason: "Can download and run extra code from the internet that isn't in the file you checked.",
  },
  {
    categories: ['INDIRECT_CODE_LOADING', 'HIDES_ITS_CODE'],
    extraWeight: 20,
    reason: 'Loads code at runtime and hides how it does it. A mod loader does the first openly; hiding the second half is what a dropper does.',
  },
  {
    categories: ['RUNS_UNCHECKED_CODE', 'REACHES_INTERNET'],
    extraWeight: 15,
    reason: 'Downloads code while the game is running and runs it.',
  },
  {
    categories: ['RUNS_UNCHECKED_CODE', 'HIDES_ITS_CODE'],
    extraWeight: 20,
    reason: 'Fetches code from somewhere else and hides how it does it.',
  },
  {
    categories: ['LOADS_NATIVE_CODE', 'HIDES_ITS_CODE'],
    extraWeight: 15,
    reason: 'Loads native code with full system access while hiding what its own code does.',
  },
  {
    categories: ['ACTS_AS_YOU_IN_GAME', 'MOVES_YOUR_ITEMS'],
    extraWeight: 20,
    theftPattern: true,
    reason: 'Can both talk to the server as you and move your items. Between them, everything you own in game can be handed to someone else.',
  },
  {
    categories: ['ACTS_AS_YOU_IN_GAME', 'CARRIES_A_TRANSFER_COMMAND'],
    extraWeight: 15,
    theftPattern: true,
    reason: 'It can type into the game as you, and the command it would type is already written into it, including who gets paid.',
  },
  {
    categories: ['STARTS_AUTOMATICALLY', 'RUNS_OTHER_PROGRAMS'],
    extraWeight: 15,
    reason: 'Starts programs and sets itself up to keep running. That is the behaviour of an installer, not a mod.',
  },
  {
    categories: ['READS_YOUR_SESSION', 'REACHES_INTERNET'],
    extraWeight: 25,
    theftPattern: true,
    reason: 'Reads the key that proves you are you, and also talks to the internet. Those two together are how a Minecraft account is taken.',
  },
  {
    categories: ['READS_YOUR_SESSION', 'INDIRECT_CODE_LOADING'],
    extraWeight: 20,
    theftPattern: true,
    reason: 'Reads your session key in the same file that loads code it did not ship with.',
  },
  {
    categories: ['READS_YOUR_SESSION', 'TOUCHES_SENSITIVE_FILES'],
    extraWeight: 25,
    theftPattern: true,
    reason: 'Reads both your session key and the files your logins are saved in.',
  },
  {
    categories: ['LOADS_NATIVE_CODE', 'REACHES_INTERNET'],
    extraWeight: 20,
    reason: 'Loads native code with full system access, and fetches from the internet in the same file.',
  },
  {
    categories: ['CHECKS_IF_IT_IS_WATCHED', 'REACHES_INTERNET'],
    extraWeight: 20,
    reason: 'Checks whether it is being examined before it reaches the internet — behaviour aimed at staying unseen rather than at working well.',
  },
  {
    categories: ['CARRIES_A_PROGRAM', 'RUNS_OTHER_PROGRAMS'],
    extraWeight: 20,
    reason: 'Carries a program inside it and can start programs. Between them, everything needed to install something on your computer is already in this file.',
  },
  {
    categories: ['CHECKS_IF_IT_IS_WATCHED', 'HIDES_ITS_CODE'],
    extraWeight: 20,
    reason: 'Makes itself hard to read and also checks whether it is being examined.',
  },
]

// Without one of these, the score is capped below the unsafe band: a pile of
// ordinary-but-noisy behaviour is never on its own proof of malice.
const CAP_ORDINARY = 49
const CAP_ESCALATED = 99
// Behaviours with no legitimate counterpart in a mod. Each is a complete finding
// by itself, so none of them waits for a second signal to clear the cap.
const ALWAYS_ESCALATES = [
  'RUNS_UNCHECKED_CODE',
  'HIDES_AN_EXECUTABLE',
  'DISABLES_YOUR_PROTECTION',
  'STRIPS_CODE_SIGNATURES',
  'USES_BLOCKCHAIN_C2',
  'HAS_A_HOLE_SOMEBODY_COULD_USE',
]

function scoreCap(firedCombos, categories, provenTampering) {
  if (provenTampering) return CAP_ESCALATED
  for (const category of categories) {
    if (ALWAYS_ESCALATES.includes(category)) return CAP_ESCALATED
  }
  const isTheft = (fired) =>
    COMBOS.some(
      (combo) =>
        combo.theftPattern === true &&
        combo.categories.length === fired.categories.length &&
        combo.categories.every((c) => fired.categories.includes(c)),
    )
  return firedCombos.some(isTheft) ? CAP_ESCALATED : CAP_ORDINARY
}

/**
 * Weighted category scoring: base weights, plus combination bonuses, minus the
 * packaging discount, then capped.
 */
/**
 * A combination means something because two independent parts of a file line up.
 * When one bundled library accounts for every half of it — a library that both
 * fetches an update and defines a class, say — the parts are not independent and
 * the combination says nothing the library did not already say.
 */
function firedByOneLibrary(combo, localities) {
  if (localities === undefined) return false
  let shared = null
  for (const category of combo.categories) {
    const locality = localities.get(category)
    if (locality === undefined || !locality.complete || locality.keys.size === 0) return false
    if (shared === null) shared = new Set(locality.keys)
    else shared = new Set([...shared].filter((key) => locality.keys.has(key)))
  }
  if (shared === null || shared.size === 0) return false
  return [...shared].every((key) => key.startsWith('lib:')) && combo.categories.every(isDiscountable)
}

export function score(categoryList, options = {}) {
  const present = new Set(categoryList)
  const packaging = options.packaging ?? 'unverified'
  const trusted = isTrusted(packaging)
  const localities = options.localities

  const fired = COMBOS.filter(
    (combo) => combo.categories.every((c) => present.has(c)) && !firedByOneLibrary(combo, localities),
  )
  const corroborated = new Set(fired.flatMap((combo) => combo.categories))

  const base = [...present].map((category) => {
    const weight = CATEGORIES[category].weight
    const discounted = trusted && isDiscountable(category) && !corroborated.has(category)
    return { category, weight: discounted ? 0 : weight, fullWeight: weight, discounted }
  })

  const combos = fired.map(({ categories, extraWeight, reason }) => ({ categories, extraWeight, reason }))
  const raw =
    base.reduce((sum, entry) => sum + entry.weight, 0) +
    combos.reduce((sum, entry) => sum + entry.extraWeight, 0)

  return {
    total: Math.min(scoreCap(combos, present, options.provenTampering ?? false), raw),
    raw,
    packaging,
    base,
    combos,
  }
}

// The app's four bands, folded onto the three verdicts this page shows.
export function verdictFor(total) {
  if (total >= 60) return 'Malicious'
  if (total >= 30) return 'Suspicious'
  return 'Safe'
}
