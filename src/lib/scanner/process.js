/**
 * Reading a command line out of a mod, and deciding what kind of finding it is.
 *
 * ModGuard splits starting a program into three, because they are three
 * different facts about a file:
 *
 *   RUNS_KNOWN_HELPER (6)       one recognised, ordinary job — `xdg-open` on a
 *                               link, `nvidia-smi` for the graphics card
 *   RUNS_A_PROGRAM_IT_NAMES (18) a program named in full in the code, readable
 *   RUNS_OTHER_PROGRAMS (26)     a shell, or a command nobody could read
 *
 * Collapsing those into one high-severity finding is what makes a scanner cry
 * wolf at every rendering mod that asks which GPU it is running on.
 */

import {
  ASK_ABOUT_HARDWARE,
  DEFENDER_TOKENS,
  FIND_A_PROGRAM,
  OPEN_A_LINK,
  RUNNABLE_EXTENSIONS,
  SHELL_METACHARACTERS,
  SHELLS_AND_INTERPRETERS,
} from './patterns.js'

const programName = (text) => {
  const base = (text.split(/[\\/]/).at(-1) ?? text).toLowerCase()
  return base.endsWith('.exe') ? base.slice(0, -4) : base
}

const isLink = (text) => /^(https?|mailto):/i.test(text.trim())

const isRunnable = (text) => {
  if (isLink(text)) return false
  const lower = text.toLowerCase()
  return RUNNABLE_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

/** Arguments that cannot themselves become a second program or a shell command. */
const argumentsLookInert = (argv) =>
  argv.slice(1).every((argument) => !isRunnable(argument) && !SHELL_METACHARACTERS.test(argument))

/** `wmic` is a hardware query only when it is asking rather than doing. */
const wmicOnlyReads = (argv) => {
  const rest = argv.slice(1).map((argument) => argument.toLowerCase())
  if (rest.length === 0) return false
  if (rest.some((argument) => ['call', 'create', 'delete', 'set', 'process'].includes(argument))) return false
  return rest.includes('get') || rest.includes('list')
}

/** The two shell spellings of "open this link in the user's browser". */
function opensALink(argv) {
  const first = programName(argv[0] ?? '')
  if (first === 'cmd' && argv.length >= 3) {
    const flag = (argv[1] ?? '').toLowerCase()
    const verb = (argv[2] ?? '').toLowerCase()
    if ((flag === '/c' || flag === '/k') && verb === 'start') {
      const target = argv.slice(3).find((argument) => argument !== '""' && argument !== '')
      if (target !== undefined && isLink(target)) return 'asks Windows to open a web page in your browser'
    }
  }
  if (first === 'rundll32' && argv.length >= 3) {
    const module = (argv[1] ?? '').toLowerCase().replace(/\s+/g, '')
    if (module === 'url.dll,fileprotocolhandler' && isLink(argv[2] ?? '')) {
      return 'asks Windows to open a web page in your browser'
    }
  }
  return null
}

function recognisedJob(name, argv) {
  if (!argumentsLookInert(argv)) return null
  const link = OPEN_A_LINK.get(name)
  if (link !== undefined) return link
  const find = FIND_A_PROGRAM.get(name)
  if (find !== undefined) return find
  const hardware = ASK_ABOUT_HARDWARE.get(name)
  if (hardware === undefined) return null
  return name === 'wmic' && !wmicOnlyReads(argv) ? null : hardware
}

/** `java -jar something.jar`: a second copy of Java on a file this mod names. */
function restartsJava(argv) {
  const first = argv[0]
  if (first === undefined) return null
  if (!['java', 'javaw', 'javaws'].includes(programName(first))) return null
  for (let at = 1; at < argv.length - 1; at++) {
    if ((argv[at] ?? '').toLowerCase() !== '-jar') continue
    const target = argv[at + 1] ?? ''
    if (!target.toLowerCase().endsWith('.jar') || SHELL_METACHARACTERS.test(target)) return null
    return target
  }
  return null
}

function disablesProtection(argv) {
  const line = argv.join(' ')
  const says = []
  for (const { token, says: what } of DEFENDER_TOKENS) {
    if (token.test(line) && !says.includes(what)) says.push(what)
  }
  return says.length === 0 ? null : says.join(', and ')
}

/**
 * What is this command line? `argv` is the string constants the calling method
 * loaded, in order; an empty one is a command assembled at runtime.
 */
export function analyseCommandLine(argv) {
  if (argv.length === 0) {
    return { verdict: 'unreadable', program: null, purpose: null, commandLine: '', hidesItsConsole: false, disablesProtection: null }
  }
  const first = argv[0] ?? ''
  const name = programName(first)
  const shared = {
    commandLine: argv.join(' '),
    hidesItsConsole: ['javaw', 'javaws'].includes(name),
    disablesProtection: disablesProtection(argv),
  }

  const jar = restartsJava(argv)
  if (jar !== null) {
    return { ...shared, verdict: 'restarts-java', program: name, purpose: `starts a second copy of Java on ${jar}, a file this mod names` }
  }

  const link = opensALink(argv)
  if (link !== null) return { ...shared, verdict: 'recognised-helper', program: name, purpose: link }
  if (SHELLS_AND_INTERPRETERS.has(name)) return { ...shared, verdict: 'shell', program: name, purpose: null }

  const job = recognisedJob(name, argv)
  if (job !== null) return { ...shared, verdict: 'recognised-helper', program: name, purpose: job }

  const namesItsProgram = !SHELLS_AND_INTERPRETERS.has(name) && argumentsLookInert(argv)
  return { ...shared, verdict: 'unrecognised', program: name, purpose: null, startsWhatItNames: namesItsProgram }
}

/**
 * Which category a command line lands in. Code that hides itself loses the
 * benefit of the doubt entirely: whatever it says it runs, it also went to
 * trouble to be unreadable.
 */
export function categoryForCommandLine(analysis, allowsSofterReading, hidesItsCode) {
  if (hidesItsCode) return 'RUNS_OTHER_PROGRAMS'
  if (analysis.verdict === 'recognised-helper' && allowsSofterReading) return 'RUNS_KNOWN_HELPER'
  if (analysis.verdict === 'restarts-java') {
    return analysis.hidesItsConsole ? 'RUNS_OTHER_PROGRAMS' : 'RUNS_A_PROGRAM_IT_NAMES'
  }
  if (analysis.verdict === 'unrecognised' && analysis.startsWhatItNames === true && allowsSofterReading) {
    return 'RUNS_A_PROGRAM_IT_NAMES'
  }
  return 'RUNS_OTHER_PROGRAMS'
}

export function describeCommandLine(analysis) {
  if (analysis.verdict === 'unreadable') return 'starts a program, and ModGuard could not read which one'
  if (analysis.purpose !== null) return analysis.purpose
  if (analysis.verdict === 'shell') return `runs a system shell or interpreter (${analysis.program})`
  return `starts ${analysis.program}`
}
