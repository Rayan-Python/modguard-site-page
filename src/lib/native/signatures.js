/**
 * What a native mod menu, injector or trainer looks like from the outside.
 *
 * The Windows API names below are public documentation, and the way they combine
 * into injection and hollowing is written up in every malware-analysis primer
 * there is. Nothing here is lifted from another scanner's data.
 *
 * The important structural point: these API groups are the *mechanism*, and for
 * these games the mechanism is often legitimate. A mod menu injects into the
 * game by design; that is what a mod menu is. So the groups below are weighted
 * for what they are, and the game profiles say which of them are expected in a
 * given ecosystem, so that "hooks the game it ships for" does not read the same
 * as "hooks a browser".
 */

export const SIGNATURE_GROUPS = [
  {
    id: 'process-injection',
    weight: 22,
    title: 'Injects code into another running process',
    patterns: [
      'CreateRemoteThread', 'WriteProcessMemory', 'VirtualAllocEx', 'VirtualProtectEx',
      'NtCreateThreadEx', 'RtlCreateUserThread', 'QueueUserAPC', 'SetWindowsHookEx',
      'NtWriteVirtualMemory', 'NtAllocateVirtualMemory',
    ],
  },
  {
    id: 'process-hollowing',
    weight: 40,
    title: 'Replaces the innards of a running program with its own code',
    // Hollowing is a specific sequence: start a process suspended, unmap its
    // image, write a new one, point the thread at it, resume. A mod menu injects
    // into a game it is meant to run inside; hollowing makes one program run as
    // another, which is a thing done to hide, not to mod. It stands on its own.
    patterns: [
      'NtUnmapViewOfSection', 'ZwUnmapViewOfSection', 'SetThreadContext', 'GetThreadContext',
      'CREATE_SUSPENDED', 'ResumeThread', 'NtResumeThread', 'WoW64SetThreadContext',
    ],
    requiresPairWith: 'process-injection',
    standsAlone: true,
  },
  {
    id: 'process-discovery',
    weight: 8,
    title: 'Looks through the list of running programs',
    patterns: [
      'CreateToolhelp32Snapshot', 'Process32First', 'Process32Next', 'EnumProcesses',
      'OpenProcess', 'NtOpenProcess',
    ],
  },
  {
    id: 'credential-theft',
    weight: 34,
    title: 'Reads saved logins, tokens or wallet files',
    patterns: [
      'loginusers.vdf', 'config\\\\loginusers', 'Local Storage\\\\leveldb', 'leveldb',
      'Login Data', 'Local State', 'cookies.sqlite', 'key4.db', 'logins.json',
      'wallet.dat', 'CryptUnprotectData', 'Discord\\\\Local Storage',
      'ssfn', 'Steam\\\\config', 'exodus.wallet', 'MetaMask',
    ],
  },
  {
    id: 'exfiltration',
    weight: 30,
    title: 'Sends data out to somewhere it chose',
    patterns: [
      'discord.com/api/webhooks', 'discordapp.com/api/webhooks', 'api.telegram.org/bot',
      'hooks.slack.com/services', 'pastebin.com/raw', 'anonfiles.com', 'transfer.sh',
      'gofile.io', 'catbox.moe', 'InternetOpenUrl', 'HttpSendRequest', 'WinHttpSendRequest',
    ],
  },
  {
    id: 'downloader',
    weight: 24,
    title: 'Downloads and runs more code while it is running',
    patterns: [
      'URLDownloadToFile', 'URLDownloadToCacheFile', 'WinHttpOpen', 'InternetReadFile',
      'System.Net.WebClient', 'DownloadString', 'DownloadFile', 'Invoke-WebRequest',
      'Invoke-Expression', 'IEX(', 'powershell -e', 'powershell.exe -nop', 'powershell -enc',
      '-EncodedCommand', 'cmd.exe /c', 'WinExec', 'ShellExecuteA', 'ShellExecuteW',
    ],
  },
  {
    id: 'defender-tampering',
    weight: 40,
    title: 'Tells Windows Defender to stop looking',
    // No mod has a reason to do this, so it stands on its own.
    patterns: [
      'Add-MpPreference', 'Set-MpPreference', 'Remove-MpPreference', '-ExclusionPath',
      '-ExclusionProcess', '-ExclusionExtension', 'DisableRealtimeMonitoring',
      'MpCmdRun', 'net stop WinDefend', 'sc stop WinDefend',
    ],
    standsAlone: true,
  },
  {
    id: 'persistence',
    weight: 26,
    title: 'Sets itself to start with the computer',
    patterns: [
      'CurrentVersion\\\\Run', 'CurrentVersion\\\\RunOnce', 'schtasks', 'reg add',
      'Start Menu\\\\Programs\\\\Startup', 'shell:startup', 'RegSetValueEx',
      'ITaskScheduler', 'TaskScheduler',
    ],
  },
  {
    id: 'anti-analysis',
    weight: 18,
    title: 'Checks whether it is being watched before it runs',
    patterns: [
      'IsDebuggerPresent', 'CheckRemoteDebuggerPresent', 'NtQueryInformationProcess',
      'OutputDebugString', 'VirtualBox', 'VBoxService', 'VMware', 'vmtoolsd', 'SbieDll',
      'WDAGUtilityAccount', 'wireshark', 'x64dbg', 'ollydbg', 'procmon',
    ],
  },
  {
    id: 'obfuscation-tooling',
    weight: 14,
    title: 'Has been through a code protector or obfuscator',
    patterns: [
      'ConfuserEx', 'Eazfuscator', '.NET Reactor', 'SmartAssembly', 'Themida', 'VMProtect',
      'Enigma Protector', 'FromBase64String', 'Convert.FromBase64String',
    ],
  },
  {
    id: 'keylogging',
    weight: 30,
    title: 'Records what you type',
    patterns: ['GetAsyncKeyState', 'GetKeyboardState', 'RegisterRawInputDevices', 'SetWindowsHookExA', 'WH_KEYBOARD_LL'],
  },
]

/**
 * Words a file uses to describe itself. On their own these are marketing, not
 * malice — most trainers really are trainers. They matter because an unsigned
 * binary that calls itself a mod menu and also reads your Steam login is a
 * different proposition from one that just calls itself a mod menu.
 */
export const SELF_DESCRIPTIONS = [
  'mod menu', 'modmenu', 'trainer', 'cheat menu', 'cheatmenu', 'injector', 'aimbot',
  'esp hack', 'unlock all', 'unlockall', 'god mode', 'godmode', 'spawner', 'recovery service',
  'money drop', 'moneydrop', 'account recovery', 'unban', 'spoofer', 'hwid',
]

/**
 * The games this module covers, and what an ordinary mod for each actually
 * contains. The desktop app handles Minecraft and Java; everything here is the
 * native side it does not reach.
 *
 * `nativePlugins` are the extensions where compiled code is *expected* — an SKSE
 * plugin is a DLL and there is nothing to say about that. `neverInAMod` is the
 * opposite: extensions with no legitimate reason to be inside a mod archive.
 */
export const GAME_PROFILES = [
  {
    id: 'rdr2',
    label: 'Red Dead Redemption 2',
    loaders: ['ScriptHookRDR2', 'Lenny’s Mod Loader', 'LML', 'RDR2 ASI Loader'],
    nativePlugins: ['.asi', '.dll'],
    assets: ['.ydr', '.ytd', '.yft', '.ymt', '.lml', '.xml', '.meta', '.rpf', '.awc'],
    markers: ['ScriptHookRDR2', 'RDR2.exe', 'LennysModLoader', 'lml/', 'RDR2'],
  },
  {
    id: 'cyberpunk2077',
    label: 'Cyberpunk 2077',
    loaders: ['RED4ext', 'Cyber Engine Tweaks', 'CET', 'redscript', 'ArchiveXL', 'TweakXL'],
    nativePlugins: ['.dll'],
    assets: ['.archive', '.reds', '.lua', '.xl', '.json', '.yaml'],
    markers: ['Cyberpunk2077.exe', 'RED4ext', 'CyberEngineTweaks', 'red4ext/plugins', 'r6/scripts'],
  },
  {
    id: 'bethesda',
    label: 'Skyrim / Fallout (Bethesda)',
    loaders: ['SKSE', 'SKSE64', 'F4SE', 'NVSE', 'OBSE', 'MO2', 'Vortex'],
    nativePlugins: ['.dll'],
    assets: ['.esp', '.esm', '.esl', '.bsa', '.ba2', '.nif', '.dds', '.pex', '.psc', '.ini', '.json'],
    markers: ['SkyrimSE.exe', 'Fallout4.exe', 'skse64', 'f4se', 'Data/SKSE/Plugins', 'SKSE/Plugins'],
  },
  {
    id: 'watchdogs',
    label: 'Watch Dogs',
    loaders: ['WD2 Mod Loader', 'Watch Dogs Loader', 'Legion Mod Loader'],
    nativePlugins: ['.dll'],
    assets: ['.forge', '.xml', '.lua', '.dat', '.sgq'],
    markers: ['WatchDogs.exe', 'WatchDogs2.exe', 'WatchDogsLegion.exe', 'Disrupt', 'loadorder'],
  },
  {
    id: 'assassinscreed',
    label: 'Assassin’s Creed',
    loaders: ['AC Mod Loader', 'Anvil Toolkit', 'Scimitar'],
    nativePlugins: ['.dll'],
    assets: ['.forge', '.fcb', '.xml', '.dat', '.pak'],
    markers: ['ACOdyssey.exe', 'ACValhalla.exe', 'ACOrigins.exe', 'AnvilNext', 'Scimitar'],
  },
]

/** Extensions that are a program in their own right — never a mod component. */
export const NEVER_IN_A_MOD = [
  '.exe', '.msi', '.scr', '.pif', '.com', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.hta', '.ps1', '.reg', '.lnk', '.cpl', '.msc',
]

/** Extensions that hold compiled native code we should read rather than judge. */
export const NATIVE_CODE_EXTENSIONS = ['.dll', '.asi', '.exe', '.so', '.dylib', '.node']

/**
 * Which game an archive or file is most likely for. Used to phrase findings, and
 * to know whether a DLL is where a DLL belongs. Returns null when nothing says.
 */
export function identifyGame(strings, entryPaths, fileName = '') {
  const haystack = `${fileName} ${entryPaths.join(' ')}`.toLowerCase()
  const text = strings.join('\n')
  let best = null
  for (const profile of GAME_PROFILES) {
    let score = 0
    for (const marker of profile.markers) {
      if (haystack.includes(marker.toLowerCase())) score += 3
      if (text.includes(marker)) score += 2
    }
    for (const loader of profile.loaders) {
      if (haystack.includes(loader.toLowerCase())) score += 3
      if (text.includes(loader)) score += 2
    }
    if (score > 0 && (best === null || score > best.score)) best = { profile, score }
  }
  return best === null ? null : best.profile
}

/**
 * Match extracted strings against the signature groups.
 *
 * Matching is case-insensitive on a joined haystack because Windows API names
 * appear in both ASCII and UTF-16 forms and in mixed case across compilers.
 */
export function matchSignatures(strings) {
  const haystack = strings.join('\n').toLowerCase()
  const hits = []
  for (const group of SIGNATURE_GROUPS) {
    const matched = []
    for (const pattern of group.patterns) {
      const needle = pattern.replace(/\\\\/g, '\\').toLowerCase()
      if (haystack.includes(needle)) matched.push(pattern.replace(/\\\\/g, '\\'))
    }
    if (matched.length > 0) hits.push({ ...group, matched: matched.slice(0, 6) })
  }
  return hits
}

export function matchSelfDescription(strings, fileName) {
  const haystack = `${fileName}\n${strings.join('\n')}`.toLowerCase()
  return SELF_DESCRIPTIONS.filter((term) => haystack.includes(term))
}
