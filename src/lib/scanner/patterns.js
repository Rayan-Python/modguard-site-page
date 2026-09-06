/**
 * The pattern tables ModGuard 1.32.0 matches against, ported as they stand.
 * Changing a pattern here changes what the page finds, so they are kept
 * together and kept literal rather than paraphrased.
 */

// --- files that hold credentials --------------------------------------------

export const SENSITIVE_FILES = [
  { pattern: /launcher_profiles\.json/i, describe: "the Minecraft launcher's saved profile data", requiresRead: true },
  { pattern: /launcher_accounts/i, describe: "the Minecraft launcher's account file" },
  { pattern: /accounts\.json/i, describe: 'a saved-accounts file' },
  { pattern: /discord(canary|ptb|development)?[\\/][^"]*(leveldb|Local Storage)/i, describe: "Discord's local login storage" },
  { pattern: /lightcord[\\/]/i, describe: "a Discord client's local login storage" },
  { pattern: /Local Storage[\\/]leveldb/i, describe: "an app's local login storage" },
  { pattern: /\.ssh[\\/]|id_rsa/i, describe: 'SSH private keys' },
  { pattern: /\.aws[\\/]credentials/i, describe: 'cloud account credentials' },
  { pattern: /[\\/](Login Data|Web Data)(?:-journal)?(?:[\\/"']|$)/, describe: "a browser's saved-passwords database" },
  { pattern: /wallet\.dat/i, describe: 'a cryptocurrency wallet file' },
  { pattern: /[\\/]Local State(?:[\\/"']|$)/, describe: 'the key a Chromium browser encrypts its saved passwords with' },
  { pattern: /[\\/](?:Network[\\/])?Cookies(?:-journal)?(?:[\\/"']|$)/, describe: "a browser's cookie database" },
  { pattern: /User Data[\\/](?:Default|Profile \d+)/i, describe: "a Chromium browser's profile folder" },
  { pattern: /[\\/]logins\.json(?:[\\/"']|$)/i, describe: "Firefox's saved-passwords file" },
  { pattern: /[\\/](?:key4\.db|key3\.db|cert9\.db|signons\.sqlite)(?:[\\/"']|$)/i, describe: 'the key Firefox encrypts its saved passwords with' },
  { pattern: /Mozilla[\\/]Firefox[\\/]Profiles/i, describe: 'a Firefox profile folder' },
  { pattern: /Ya ?Passman Data/i, describe: "Yandex Browser's saved-passwords database" },
  { pattern: /Local Extension Settings[\\/][a-p]{32}/, describe: "a browser wallet extension's stored keys" },
  { pattern: /nkbihfbeogaeaoehlefnkodbefgpgknn/i, describe: "the MetaMask wallet extension's stored keys" },
  { pattern: /[\\/]Exodus[\\/]exodus\.wallet/i, describe: "the Exodus wallet's key file" },
  { pattern: /[\\/]Electrum[\\/]wallets(?:[\\/"']|$)/i, describe: 'an Electrum wallet file' },
  { pattern: /[\\/]Ledger Live(?:[\\/"']|$)/i, describe: "Ledger Live's local data" },
  { pattern: /Telegram Desktop[\\/]tdata/i, describe: "Telegram's saved login" },
  { pattern: /[\\/](?:loginusers\.vdf|ssfn\d{6,})(?:[\\/"']|$)/i, describe: 'a saved Steam login' },
  { pattern: /[\\/](?:recentservers\.xml|sitemanager\.xml)(?:[\\/"']|$)/i, describe: "FileZilla's saved server passwords" },
  { pattern: /launcher_msa_credentials/i, describe: "the Minecraft launcher's saved Microsoft login" },
  { pattern: /TlauncherProfiles\.json/i, describe: "TLauncher's saved account file" },
  { pattern: /com\.modrinth\.theseus[\\/]profiles\.json/i, describe: "the Modrinth app's saved account file" },
]

export const OUTSIDE_PATHS = [
  { pattern: /^[A-Za-z]:\\/, describe: 'an absolute Windows path' },
  { pattern: /%APPDATA%|%USERPROFILE%|%LOCALAPPDATA%/i, describe: 'a Windows user-profile folder' },
  { pattern: /^\/(etc|usr|var|home|Users|Library|tmp)\//, describe: 'a system folder path' },
  { pattern: /^~\//, describe: "the user's home folder" },
  { pattern: /\.\.[\\/]/, describe: 'a path that climbs out of its own folder' },
  { pattern: /user\.home/, describe: "the user's home folder" },
]

// --- persistence ------------------------------------------------------------

export const PERSISTENCE = [
  { pattern: /CurrentVersion\\+Run/i, describe: 'the Windows autorun registry key' },
  { pattern: /Start Menu\\+Programs\\+Startup/i, describe: 'the Windows Startup folder' },
  { pattern: /schtasks/i, describe: 'Windows scheduled tasks' },
  { pattern: /LaunchAgents|LaunchDaemons/, describe: 'macOS auto-start services' },
  { pattern: /crontab|\/etc\/init\.d|systemd/, describe: 'Linux auto-start services' },
]

// --- in-game commands written into the code ---------------------------------
// Two sets: commands written with their leading slash, and commands written the
// way the chat-command packet takes them (no slash).

const NAME = String.raw`[A-Za-z0-9_]{3,16}`
const AMOUNT = String.raw`\$?\d[\d.,]*\s*[kmbKMB]?`

const SLASHED = [
  { pattern: /^\/(pay|paytoggle)\b/i, describe: 'a command that pays another player', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: /^\/(money|bal|balance|eco|economy)\s+(pay|send|give|transfer)/i, describe: 'a command that transfers your balance', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: /^\/(trade|transfer)\b/i, describe: 'a command that hands over your money or items', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: /^\/give\s+[A-Za-z0-9_]{3,16}\s/i, describe: 'a ready-made command that gives items to a named player', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: /^\/(withdraw|deposit)\b/i, describe: 'a command that moves your money in or out of a bank', category: 'ACTS_AS_YOU_IN_GAME' },
  { pattern: /^\/(sell|ah|auction|shop)\s/i, describe: 'a command that sells or lists your items', category: 'ACTS_AS_YOU_IN_GAME' },
  { pattern: /^\/(msg|w|tell|whisper)\s/i, describe: 'a command that sends a private message as you', category: 'ACTS_AS_YOU_IN_GAME' },
]

const BARE = [
  { pattern: new RegExp(String.raw`^pay\s+${NAME}\s+${AMOUNT}$`, 'i'), describe: 'a ready-made command that pays a named player', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: new RegExp(String.raw`^(money|eco|economy|bal|balance)\s+(pay|send|give|transfer)\s+${NAME}\b`, 'i'), describe: 'a ready-made command that transfers your balance to a named player', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: new RegExp(String.raw`^transfer\s+${NAME}\s+${AMOUNT}$`, 'i'), describe: 'a ready-made command that transfers money to a named player', category: 'CARRIES_A_TRANSFER_COMMAND' },
  { pattern: new RegExp(String.raw`^(withdraw|deposit)\s+${AMOUNT}$`, 'i'), describe: 'a ready-made command that moves your money in or out of a bank', category: 'ACTS_AS_YOU_IN_GAME' },
  { pattern: /^(sell|ah|auction)\s+(all|hand|hands|inv|inventory)\b/i, describe: 'a ready-made command that sells what you are carrying', category: 'ACTS_AS_YOU_IN_GAME' },
]

export const HARDCODED_COMMANDS = [...SLASHED, ...BARE]

// --- the Java APIs each behaviour is made of --------------------------------

export const NETWORK_CLASSES = new Set([
  'java/net/Socket', 'java/net/ServerSocket', 'java/net/DatagramSocket', 'java/net/URLConnection',
  'java/net/HttpURLConnection', 'java/net/http/HttpClient', 'java/net/http/HttpRequest',
  'java/nio/channels/SocketChannel', 'okhttp3/OkHttpClient', 'org/apache/http/impl/client/HttpClients',
])
export const URL_FETCH_METHODS = new Set(['openConnection', 'openStream', 'getContent'])

export const FILE_CLASSES = new Set([
  'java/io/File', 'java/io/FileInputStream', 'java/io/FileOutputStream', 'java/io/FileReader',
  'java/io/FileWriter', 'java/io/RandomAccessFile', 'java/nio/file/Files', 'java/nio/file/Paths',
  'java/nio/file/Path',
])
export const FILE_READ_CLASSES = new Set(['java/io/FileInputStream', 'java/io/FileReader', 'java/io/RandomAccessFile'])
export const FILE_READ_METHODS = new Set(['readAllBytes', 'readString', 'readAllLines', 'newInputStream', 'newBufferedReader', 'lines'])

export const INDIRECT_LOADER_CLASSES = new Set([
  'java/net/URLClassLoader', 'javax/script/ScriptEngine', 'javax/script/ScriptEngineManager',
  'jdk/nashorn/api/scripting/NashornScriptEngine',
])

export const UNSAFE_CLASSES = new Set(['sun/misc/Unsafe', 'jdk/internal/misc/Unsafe'])
export const INSTRUMENTATION_CLASSES = new Map([
  ['java/lang/instrument/Instrumentation', "can rewrite other programs' code as it loads (java.lang.instrument.Instrumentation)"],
])

// Unsafe is a normal tool for memory work; a performance mod that uses it that
// way is not asking for extra access. Only the other members count.
const UNSAFE_MEMORY_METHODS = new Set([
  'allocateMemory', 'reallocateMemory', 'freeMemory', 'setMemory', 'copyMemory', 'copySwapMemory',
  'addressSize', 'pageSize', 'invokeCleaner', 'arrayBaseOffset', 'arrayIndexScale',
  'objectFieldOffset', 'staticFieldOffset', 'fullFence', 'loadFence', 'storeFence', 'park',
  'unpark', 'getAddress', 'putAddress',
])
const UNSAFE_ACCESSOR = /^(get|put)(Byte|Boolean|Short|Char|Int|Long|Float|Double|Object|Reference)(Volatile|Opaque|Acquire|Release|Unaligned)?$/
const UNSAFE_CAS = /^(compareAndSwap|compareAndSet|compareAndExchange|weakCompareAndSet|getAndAdd|getAndSet|getAndBitwise)[A-Za-z]*$/
export const isRoutineUnsafeUse = (name) =>
  UNSAFE_MEMORY_METHODS.has(name) || UNSAFE_ACCESSOR.test(name) || UNSAFE_CAS.test(name)

export const REFLECTION_METHODS = [
  { owner: 'java/lang/Class', names: ['forName', 'getMethod', 'getDeclaredMethod', 'getConstructor', 'getDeclaredConstructor', 'getField', 'getDeclaredField', 'newInstance'] },
  { owner: 'java/lang/reflect/Method', names: ['invoke'] },
  { owner: 'java/lang/reflect/Constructor', names: ['newInstance'] },
  { owner: 'java/lang/ClassLoader', names: ['loadClass', 'defineClass'] },
  { owner: 'java/lang/invoke/MethodHandles', names: ['lookup'] },
  { owner: 'java/lang/invoke/MethodHandles$Lookup', names: ['findVirtual', 'findStatic', 'findSpecial', 'unreflect'] },
]

// Reaching one of these by name, when the name is hidden, is the thing worth
// reporting — not the reflection itself, which every mixin-shaped mod uses.
export const REFLECTION_TARGETS = [
  { names: ['java.lang.Runtime'], methods: ['exec', 'getRuntime', 'load', 'loadLibrary', 'halt'], category: 'RUNS_OTHER_PROGRAMS', meaning: 'the class that runs system commands' },
  { names: ['java.lang.ProcessBuilder'], methods: ['start', 'command'], category: 'RUNS_OTHER_PROGRAMS', meaning: 'the class that starts other programs' },
  { names: ['java.net.URL', 'java.net.HttpURLConnection', 'java.net.URLConnection', 'java.net.Socket', 'java.net.http.HttpClient'], methods: ['openConnection', 'openStream', 'getOutputStream', 'send', 'connect'], category: 'REACHES_INTERNET', meaning: 'the class that opens connections to the internet' },
  { names: ['java.net.URLClassLoader', 'javax.script.ScriptEngineManager', 'jdk.internal.loader.BuiltinClassLoader'], methods: ['defineClass', 'loadClass', 'getEngineByName', 'eval'], category: 'INDIRECT_CODE_LOADING', meaning: 'the machinery for loading and running code that is not in this file' },
  { names: ['sun.misc.Unsafe', 'jdk.internal.misc.Unsafe'], methods: ['getUnsafe', 'theUnsafe', 'putObject', 'allocateInstance'], category: 'ASKS_EXTRA_ACCESS', meaning: "the back door past Java's own safety checks" },
  { names: ['java.lang.instrument.Instrumentation'], methods: ['retransformClasses', 'redefineClasses'], category: 'ASKS_EXTRA_ACCESS', meaning: 'the machinery for rewriting other code as it loads' },
]

export const PROCESS_BUILDER_CLASSES = new Set(['java/lang/ProcessBuilder'])

export const NATIVE_EXTENSIONS = ['.dll', '.so', '.dylib', '.jnilib']
export const PROGRAM_EXTENSIONS = [
  '.exe', '.msi', '.com', '.scr', '.pif', '.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.jse', '.wsf',
  '.hta', '.inf',
]

// --- Minecraft's own APIs ---------------------------------------------------

const SESSION_OWNER = /(client\/User|util\/Session|MinecraftSessionService)$/
const SESSION_METHODS = new Set(['getAccessToken', 'getToken', 'getSessionId', 'getSessionID'])
export const readsSessionToken = (ref) =>
  (SESSION_OWNER.test(ref.owner) && SESSION_METHODS.has(ref.name)) ||
  (ref.owner === 'net/minecraft/class_320' && ref.name === 'method_1674')

export const CHAT_SEND_METHODS = [
  { owner: /^net\/minecraft\/client\/(network|player)\//, names: ['sendChatMessage', 'sendChatCommand', 'sendCommand', 'sendMessage'] },
  { owner: /^net\/minecraft\/client\/(player|multiplayer)\//, names: ['chat', 'sendChat', 'sendCommand', 'sendUnsignedCommand'] },
  { owner: /^net\/minecraft\/(client\/)?entity\//, names: ['sendChatMessage'] },
]

const MAPPED = 'net/minecraft/'
const INTERMEDIARY_NAMES = {
  class_310: 'MinecraftClient/Minecraft — the game itself',
  class_634: 'ClientPlayNetworkHandler/ClientPacketListener — your connection to the server',
  class_636: 'ClientPlayerInteractionManager/MultiPlayerGameMode — how you click on things',
  class_746: 'ClientPlayerEntity/LocalPlayer — you, in the world',
  class_642: 'ServerInfo/ServerData — which server you are connected to',
  class_2596: 'Packet — one message sent to the server',
  class_2797: 'ChatMessageC2SPacket/ServerboundChatPacket — a chat message sent as you',
  class_7472: 'CommandExecutionC2SPacket/ServerboundChatCommandPacket — a command run as you',
  class_2813: 'ClickSlotC2SPacket/ServerboundContainerClickPacket — clicking a slot in your inventory',
  class_2846: 'PlayerActionC2SPacket/ServerboundPlayerActionPacket — dropping or breaking something',
  class_2873: 'CreativeInventoryActionC2SPacket/ServerboundSetCreativeModeSlotPacket — putting an item into a slot',
}
export const describeIntermediary = (name) =>
  name.startsWith(MAPPED) ? INTERMEDIARY_NAMES[name.slice(MAPPED.length)] ?? null : null

const CHAT_PACKETS_INTERMEDIARY = new Set([`${MAPPED}class_2797`, `${MAPPED}class_7472`])
const ITEM_PACKETS_INTERMEDIARY = new Set([`${MAPPED}class_2813`, `${MAPPED}class_2846`, `${MAPPED}class_2873`])
export const CHAT_PACKET_NAMES = [
  'ServerboundChatPacket', 'ServerboundChatCommandPacket', 'ServerboundChatCommandSignedPacket',
  'ChatMessageC2SPacket', 'CommandExecutionC2SPacket', 'RequestCommandCompletionsC2SPacket',
]
export const ITEM_PACKET_NAMES = [
  'ServerboundContainerClickPacket', 'ServerboundPlayerActionPacket', 'ClickSlotC2SPacket',
  'PlayerActionC2SPacket', 'ServerboundSetCreativeModeSlotPacket', 'CreativeInventoryActionC2SPacket',
]
export const isChatPacket = (name) => CHAT_PACKETS_INTERMEDIARY.has(name)
export const isItemPacket = (name) => ITEM_PACKETS_INTERMEDIARY.has(name)

const NETWORK_HANDLER = `${MAPPED}class_634`
const LOCAL_PLAYER = `${MAPPED}class_746`
const PACKET_DESCRIPTORS = [
  `L${MAPPED}class_2596;`,
  'Lnet/minecraft/network/protocol/Packet;',
  'Lnet/minecraft/network/packet/Packet;',
]
const HANDLER_OWNERS = new Set([
  NETWORK_HANDLER,
  'net/minecraft/client/network/ClientPlayNetworkHandler',
  'net/minecraft/client/multiplayer/ClientPacketListener',
])
export const sendsPacket = (ref) =>
  HANDLER_OWNERS.has(ref.owner) &&
  ref.descriptor.endsWith(')V') &&
  PACKET_DESCRIPTORS.some((descriptor) => ref.descriptor.startsWith(`(${descriptor}`))

const OBFUSCATED_METHOD = /^m_\d+_$/
const MAPPED_CHAT_OWNERS = new Set([
  'net/minecraft/client/multiplayer/ClientPacketListener',
  'net/minecraft/client/player/LocalPlayer',
  'net/minecraft/client/network/ClientPlayNetworkHandler',
  'net/minecraft/client/network/ClientPlayerEntity',
])
export const sendsOneLineOfText = (ref) => {
  if (ref.descriptor !== '(Ljava/lang/String;)V') return false
  if (ref.owner === NETWORK_HANDLER || ref.owner === LOCAL_PLAYER) return true
  return MAPPED_CHAT_OWNERS.has(ref.owner) && OBFUSCATED_METHOD.test(ref.name)
}

export const INVENTORY_OWNER = /^net\/minecraft\/client\/(network|multiplayer)\/(ClientPlayerInteractionManager|MultiPlayerGameMode)/
export const INVENTORY_METHODS = ['clickSlot', 'handleInventoryMouseClick', 'dropSelectedItem', 'dropItem', 'drop', 'clickButton', 'clickRecipe', 'sendButtonPressed']
export const PLAYER_OWNER = /^net\/minecraft\/(client\/(network|player)\/(ClientPlayerEntity|LocalPlayer)|entity\/player\/PlayerEntity)/
export const DROP_METHODS = ['drop', 'dropSelectedItem', 'dropItem']

// --- process command lines --------------------------------------------------

export const SHELLS_AND_INTERPRETERS = new Set([
  'sh', 'bash', 'zsh', 'dash', 'ksh', 'csh', 'tcsh', 'fish', 'busybox', 'cmd', 'command',
  'powershell', 'pwsh', 'wsl', 'wsl.exe', 'osascript', 'applescript', 'automator', 'python',
  'python2', 'python3', 'perl', 'ruby', 'php', 'node', 'deno', 'bun', 'java', 'javaw', 'javaws',
  'jshell', 'wscript', 'cscript', 'mshta', 'rundll32', 'regsvr32', 'msiexec', 'installutil',
  'certutil', 'bitsadmin', 'curl', 'wget', 'ftp', 'tftp', 'scp', 'ssh', 'telnet', 'nc', 'ncat',
  'netcat', 'socat', 'reg', 'schtasks', 'at', 'sc', 'net', 'net1', 'netsh', 'taskkill', 'tasklist',
  'vssadmin', 'bcdedit', 'wusa', 'attrib', 'icacls', 'cacls', 'takeown', 'sudo', 'su', 'doas',
  'chmod', 'chown', 'launchctl', 'systemctl', 'service', 'crontab', 'defaults', 'killall', 'pkill',
  'xattr', 'codesign', 'spctl', 'eval', 'exec', 'start', 'call',
])

export const OPEN_A_LINK = new Map([
  ['xdg-open', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['gio', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['gnome-open', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['kde-open', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['kde-open5', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['exo-open', 'asks Linux to open a link or file in whatever program you normally use for it'],
  ['wslview', 'asks Windows to open a link from inside Linux'],
  ['open', 'asks macOS to open a link or file in whatever program you normally use for it'],
  ['explorer', 'asks Windows to open a link or folder in whatever program you normally use for it'],
])

export const ASK_ABOUT_HARDWARE = new Map([
  ['lspci', 'asks Linux which graphics card and other hardware the computer has'],
  ['lshw', 'asks Linux what hardware the computer has'],
  ['glxinfo', 'asks Linux which graphics driver is installed'],
  ['vulkaninfo', 'asks the computer which graphics driver is installed'],
  ['nvidia-smi', 'asks the NVIDIA driver about the graphics card'],
  ['xrandr', 'asks Linux about the monitors that are plugged in'],
  ['system_profiler', 'asks macOS what hardware the computer has'],
  ['sw_vers', 'asks macOS which version it is'],
  ['uname', 'asks the computer which system it is running'],
  ['sysctl', 'asks macOS or Linux about the hardware it is running on'],
  ['getconf', 'asks the system about its own settings'],
  ['dxdiag', 'asks Windows what hardware the computer has'],
  ['wmic', 'asks Windows what hardware the computer has'],
  ['df', 'asks the computer how much free space is left on the disk'],
])

export const FIND_A_PROGRAM = new Map([
  ['which', 'asks the computer where a program is installed, without running it'],
  ['whereis', 'asks Linux where a program is installed, without running it'],
  ['where', 'asks Windows where a program is installed, without running it'],
])

export const RUNNABLE_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.msi', '.ps1', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
  '.hta', '.jar', '.sh', '.bash', '.app', '.desktop', '.dll', '.so', '.dylib', '.pkg', '.dmg',
  '.apk', '.appimage', '.run', '.bin', '.inf', '.reg', '.lnk', '.msc', '.cpl',
]
export const SHELL_METACHARACTERS = /[;&|`$><\n\r]|\$\(/

export const DEFENDER_TOKENS = [
  { token: /\bAdd-MpPreference\b/i, says: 'adds a Windows Defender exclusion' },
  { token: /\bSet-MpPreference\b/i, says: "changes Windows Defender's settings" },
  { token: /\bRemove-MpPreference\b/i, says: 'removes a Windows Defender setting' },
  { token: /-ExclusionPath\b/i, says: 'tells Windows Defender to stop scanning a folder' },
  { token: /-ExclusionProcess\b/i, says: 'tells Windows Defender to stop scanning a program' },
  { token: /-ExclusionExtension\b/i, says: 'tells Windows Defender to stop scanning a kind of file' },
  { token: /-?DisableRealtimeMonitoring\b/i, says: "turns off Windows Defender's live scanning" },
  { token: /\bMpCmdRun\b/i, says: 'drives Windows Defender from the command line' },
  { token: /\bMsMpEng\b/i, says: "names Windows Defender's own process" },
]

// --- launcher injection -----------------------------------------------------

export const LAUNCH_CONFIG_NAMES = new Set([
  'instance.cfg', 'user_jvm_args.txt', 'launcher_profiles.json', 'launcher_profiles_microsoft_store.json',
])
export const JAVA_AGENT_FLAG = /-javaagent:|-Xbootclasspath/i
export const JAVA_TOOL_OPTIONS = /\b(?:JAVA_TOOL_OPTIONS|_JAVA_OPTIONS)\b/
export const LAUNCH_COMMAND_LINE = /^\s*(PreLaunchCommand|WrapperCommand|PostExitCommand)\s*=\s*(\S.*)$/gim
export const AGENT_MANIFEST = /^(Premain-Class|Agent-Class|Launcher-Agent-Class)\s*:/im

// --- hosts and addresses ----------------------------------------------------

export const HOST_KINDS = [
  { match: /(^|\.)(curseforge\.com|modrinth\.com|fabricmc\.net|minecraftforge\.net|neoforged\.net|quiltmc\.org|papermc\.io)$/i, routine: true, kind: 'mod-hosting' },
  { match: /(^|\.)(maven\.apache\.org|repo1\.maven\.org|jitpack\.io|sonatype\.org)$/i, routine: true, kind: 'library repository' },
  { match: /(^|\.)(mojang\.com|minecraft\.net|minecraftservices\.com)$/i, routine: true, kind: "Mojang's own service" },
  { match: /(^|\.)(github\.com|githubusercontent\.com|gitlab\.com)$/i, routine: false, kind: 'code hosting' },
  { match: /(^|\.)(discord\.com|discordapp\.com|discord\.gg|discordapp\.net)$/i, routine: false, kind: 'Discord' },
  { match: /(^|\.)(api\.telegram\.org|telegram\.org|t\.me)$/i, routine: false, kind: 'Telegram' },
  { match: /(^|\.)(hooks\.slack\.com|slack\.com)$/i, routine: false, kind: 'Slack' },
  { match: /(^|\.)(pastebin\.com|hastebin\.com|paste\.ee|ghostbin\.com|termbin\.com|0x0\.st|transfer\.sh|file\.io|anonfiles\.com|gofile\.io|catbox\.moe|litterbox\.catbox\.moe|mediafire\.com|pixeldrain\.com|limewire\.com|mega\.nz|mega\.io|wetransfer\.com|we\.tl|filebin\.net|bashupload\.com|uguu\.se|tmpfiles\.org|krakenfiles\.com|dropmefiles\.com)$/i, routine: false, kind: 'an anonymous paste or file-drop service' },
  { match: /(^|\.)(duckdns\.org|no-ip\.(com|org|biz)|ddns\.net|hopto\.org|ngrok\.io|ngrok-free\.app|trycloudflare\.com|loca\.lt|serveo\.net)$/i, routine: false, kind: 'a dynamic-DNS or tunnel host' },
  { match: /(^|\.)(bit\.ly|tinyurl\.com|t\.co|is\.gd|shorturl\.at|rb\.gy|cutt\.ly)$/i, routine: false, kind: 'a link shortener' },
  { match: /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i, routine: true, kind: 'this computer' },
]

export const WEBHOOK_ENDPOINTS = [
  { pattern: /discord(app)?\.com\/api\/webhooks\//i, describe: 'a Discord webhook' },
  { pattern: /api\.telegram\.org\/bot/i, describe: 'a Telegram bot address' },
  { pattern: /hooks\.slack\.com\/services\//i, describe: 'a Slack webhook' },
  { pattern: /(pastebin|hastebin|transfer\.sh|file\.io|anonfiles|catbox\.moe)/i, describe: 'an anonymous file-drop service' },
]

export const extractUrls = (text) => [...text.matchAll(/https?:\/\/[^\s"'<>\\)]{4,}/gi)].map((match) => match[0])

/**
 * A bare public IP address, and only that. Reserved, private, loopback,
 * multicast and documentation ranges are not addresses anyone exfiltrates to,
 * and the whole string has to be the address — which is what keeps a version
 * number from being read as one.
 */
export function publicIpAddress(text) {
  const match = /^\s*((?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?\s*$/.exec(text)
  const address = match?.[1]
  if (address === undefined) return null
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  const [a = 0, b = 0] = octets
  const reserved =
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    (a === 100 && b >= 64 && b <= 127)
  return reserved ? null : match[0].trim()
}

const FILE_LIKE = /\.(java|class|json|toml|png|jpg|jpeg|txt|md|yml|yaml|cfg|properties|jar|zip|xml|html|css|js|ts|lang|nbt|ogg|mcmeta|exe|dll|dylib|so|bat|cmd|ps1|sh|msi|app|bin|dat|log|lock|tmp|db|ini|conf|mcfunction|vsh|fsh|glsl|obj|mtl|wav|mp3|ttf|otf)$/i
const PACKAGE_HEADS = new Set(['com', 'net', 'org', 'io', 'dev', 'me', 'app', 'gg', 'co', 'edu', 'gov', 'uk', 'eu'])
const JAVA_PROPERTY_HEADS = new Set(['java', 'javax', 'jdk', 'sun', 'user', 'os', 'awt', 'swing', 'line'])
const REAL_TLDS = new Set([
  'com', 'org', 'net', 'io', 'dev', 'app', 'gg', 'co', 'me', 'tv', 'cc', 'xyz', 'info', 'biz',
  'online', 'site', 'cloud', 'sh', 'st', 'to', 'ly', 'link', 'live', 'life', 'world', 'space',
  'tech', 'store', 'shop', 'fun', 'wiki', 'one', 'pro', 'art', 'run', 'zone', 'digital', 'network',
  'systems', 'tools', 'services', 'solutions', 'software', 'team', 'group', 'company', 'gov', 'edu',
  'mil', 'int', 'eu', 'asia', 'moe', 'lol', 'fyi', 'page', 'email', 'chat', 'games', 'game',
  'media', 'news', 'blog', 'click', 'top', 'host', 'website', 'server', 'codes', 'computer',
  'download', 'cf', 'tk',
])
const TWO_LETTER = /^[a-z]{2}$/

/**
 * Hostnames written as bare text. Java package names, class names and file
 * names all read like domains, so anything that looks more like code than like
 * an address is dropped.
 */
export function extractHosts(text) {
  const found = []
  for (const match of text.matchAll(/\b((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24})(?::\d{2,5})?\b/g)) {
    const host = match[1]
    if (host === undefined || FILE_LIKE.test(host)) continue
    const labels = host.split('.')
    const tld = labels.at(-1) ?? ''
    const head = (labels[0] ?? '').toLowerCase()
    if (!/^[a-z]{2,24}$/.test(tld)) continue
    if (!REAL_TLDS.has(tld) && !TWO_LETTER.test(tld)) continue
    if (labels.length >= 3 && PACKAGE_HEADS.has(head)) continue
    if (JAVA_PROPERTY_HEADS.has(head)) continue
    if (labels.some((label) => /[A-Z]/.test(label))) continue
    found.push(match[0])
  }
  return found
}

export function classifyHost(host) {
  const normalised = host.toLowerCase().replace(/^www\./, '')
  for (const entry of HOST_KINDS) {
    if (entry.match.test(normalised)) return { kind: entry.kind, routine: entry.routine }
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalised)) {
    return publicIpAddress(normalised) === null
      ? { kind: 'an address on a private network', routine: true }
      : { kind: 'a bare IP address with no domain name', routine: false }
  }
  return { kind: 'a web address', routine: false }
}

// --- package roots ----------------------------------------------------------

// Java package roots read one way for a vendor package and another for a
// reverse-domain one: `xaero/minimap` and `xaero/common` are the same author's
// code, while `dev/majanito` and `dev/neko` are not each other's. So a first
// segment that is a domain suffix takes the second segment with it, and one that
// is a name stands alone. Getting this wrong marks an honest multi-package mod
// as having start-up code from somewhere else.
const DOMAIN_HEADS = new Set([
  'com', 'net', 'org', 'io', 'dev', 'me', 'gg', 'app', 'co', 'xyz', 'cc', 'tv', 'eu', 'uk', 'de',
  'fr', 'nl', 'ru', 'pl', 'it', 'es', 'ca', 'us', 'info', 'biz', 'moe', 'fun', 'one', 'site',
  'tech', 'online', 'pro', 'sh', 'to', 'at', 'be', 'ch', 'cz', 'dk', 'fi', 'gr', 'hu', 'ie', 'jp',
  'kr', 'no', 'nz', 'pt', 'se', 'tr', 'br', 'cn', 'in', 'au', 'za', 'mx', 'ar', 'cl', 'id', 'my',
  'th', 'vn', 'ph', 'sg', 'hk', 'tw', 'il', 'ua', 'ro', 'bg', 'hr', 'rs', 'si', 'sk', 'lt', 'lv',
  'ee', 'is', 'lu', 'mt', 'cy', 'by', 'kz', 'gay', 'wtf', 'lol',
])

export function packageRoot(className) {
  const parts = className.split('/')
  if (parts.length < 2) return null
  const head = parts[0] ?? ''
  if (!DOMAIN_HEADS.has(head.toLowerCase())) return head
  return parts.length < 3 ? null : `${head}/${parts[1]}`
}
