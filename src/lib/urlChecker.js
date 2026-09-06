/**
 * URL checking: Google Safe Browsing lookup plus the lookalike-domain and
 * host-class heuristics ModGuard 1.32.0 applies to endpoints it finds in a mod.
 */

const SAFE_BROWSING_KEY = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_API_KEY

export const isSafeBrowsingConfigured = Boolean(SAFE_BROWSING_KEY)

export function parseHost(input) {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return url.hostname === '' ? null : { url: url.href, host: url.hostname.toLowerCase() }
  } catch {
    return null
  }
}

// --- Lookalike / typosquat detection ---------------------------------------

const PLATFORMS = [
  { domain: 'steamcommunity.com', label: 'Steam Community' },
  { domain: 'curseforge.com', label: 'CurseForge' },
  { domain: 'modrinth.com', label: 'Modrinth' },
  { domain: 'discord.com', label: 'Discord' },
]

// Domains that legitimately belong to the same operators, so a match on these
// is not a lookalike.
const PLATFORM_SIBLINGS = [
  'steampowered.com',
  'forgecdn.net',
  'cursemaven.com',
  'discordapp.com',
  'discordapp.net',
  'discord.gg',
  'discordstatus.com',
]

const stripWww = (host) => host.replace(/^www\./, '')

const isExactOrSubdomain = (host, domain) => host === domain || host.endsWith(`.${domain}`)

// Characters attackers swap in to make a name read the same at a glance.
const HOMOGLYPHS = [
  [/rn/g, 'm'],
  [/vv/g, 'w'],
  [/0/g, 'o'],
  [/1/g, 'l'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/7/g, 't'],
]

function normalizeHomoglyphs(value) {
  let out = value
  for (const [pattern, replacement] of HOMOGLYPHS) out = out.replace(pattern, replacement)
  return out
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = row
  }
  return prev[b.length]
}

// "steamcommunity" -> the part a typosquat imitates
const brandOf = (domain) => domain.split('.')[0]

export function checkLookalike(host) {
  const bare = stripWww(host)

  for (const platform of PLATFORMS) {
    if (isExactOrSubdomain(bare, platform.domain)) return null
  }
  for (const sibling of PLATFORM_SIBLINGS) {
    if (isExactOrSubdomain(bare, sibling)) return null
  }

  if (bare.startsWith('xn--') || bare.includes('.xn--')) {
    return { reason: 'This address uses a punycode domain, which can render as letters it does not actually contain.' }
  }

  const labels = bare.split('.')
  const registrable = labels.slice(-2).join('.')
  const brand = brandOf(registrable)

  for (const platform of PLATFORMS) {
    const platformBrand = brandOf(platform.domain)

    // steamcommunity.com.some-other-site.ru — the real name pushed into a subdomain.
    if (labels.slice(0, -2).some((label) => label === platformBrand || label === platform.domain.replace('.', '-'))) {
      return { reason: `"${platform.domain}" appears only as a subdomain here — the real site is ${registrable}, not ${platform.label}.` }
    }

    if (registrable === platform.domain) continue

    // curseforge-downloads.com, steam-community.net, modrinth.co
    const stripped = brand.replace(/[^a-z0-9]/g, '')
    const platformStripped = platformBrand.replace(/[^a-z0-9]/g, '')
    if (stripped === platformStripped) {
      return { reason: `This spells ${platform.label}'s name but on a different domain (${registrable}).` }
    }
    if (stripped.startsWith(platformStripped) || stripped.endsWith(platformStripped)) {
      return { reason: `This wraps ${platform.label}'s name in a longer domain (${registrable}) that ${platform.label} does not own.` }
    }

    const distance = Math.min(
      editDistance(brand, platformBrand),
      editDistance(normalizeHomoglyphs(brand), normalizeHomoglyphs(platformBrand)),
    )
    if (distance > 0 && distance <= 2) {
      return { reason: `This is ${distance} character${distance === 1 ? '' : 's'} away from ${platform.domain} — a typosquat of ${platform.label}.` }
    }
  }

  return null
}

// --- Host classification ----------------------------------------------------
// Lifted from the endpoint table in the desktop app's checker.

const HOST_CLASSES = [
  {
    match: /(^|\.)(duckdns\.org|no-ip\.(com|org|biz)|ddns\.net|hopto\.org|ngrok\.io|ngrok-free\.app|trycloudflare\.com|loca\.lt|serveo\.net)$/i,
    reason: 'This is a dynamic-DNS or tunnel host — someone’s own computer exposed to the internet, not a real service.',
  },
  {
    match: /(^|\.)(bit\.ly|tinyurl\.com|t\.co|is\.gd|shorturl\.at|rb\.gy|cutt\.ly)$/i,
    reason: 'This is a link shortener, which hides where the connection actually ends up.',
  },
  {
    match: /(^|\.)(pastebin\.com|hastebin\.com|paste\.ee|ghostbin\.com|termbin\.com|0x0\.st|transfer\.sh|file\.io|anonfiles\.com|gofile\.io|catbox\.moe|litterbox\.catbox\.moe|mediafire\.com|pixeldrain\.com|limewire\.com|mega\.nz|mega\.io|wetransfer\.com|we\.tl|filebin\.net|bashupload\.com|uguu\.se|tmpfiles\.org|krakenfiles\.com|dropmefiles\.com)$/i,
    reason: 'This is an anonymous paste or file-drop service — a common place to park a payload.',
  },
]

const IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

export function classifyHost(host) {
  const bare = stripWww(host)
  for (const entry of HOST_CLASSES) {
    if (entry.match.test(bare)) return { reason: entry.reason }
  }
  if (IPV4.test(bare)) {
    return { reason: 'This is a bare IP address with no domain name — it cannot be looked up or reported the way a domain can.' }
  }
  return null
}

// --- Google Safe Browsing ---------------------------------------------------

const SAFE_BROWSING_ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

const THREAT_LABELS = {
  MALWARE: 'hosting malware',
  SOCIAL_ENGINEERING: 'phishing or social engineering',
  UNWANTED_SOFTWARE: 'unwanted software',
  POTENTIALLY_HARMFUL_APPLICATION: 'a potentially harmful application',
}

// Without this, a stalled connection leaves the Check button spinning forever:
// fetch has no default timeout, so the promise simply never settles.
const SAFE_BROWSING_TIMEOUT_MS = 8000

export async function checkSafeBrowsing(url) {
  if (!SAFE_BROWSING_KEY) return { status: 'unconfigured' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SAFE_BROWSING_TIMEOUT_MS)

  try {
    const response = await fetch(`${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(SAFE_BROWSING_KEY)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'modguard-site', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: Object.keys(THREAT_LABELS),
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    })

    if (!response.ok) return { status: 'error' }

    const body = await response.json()
    const match = body?.matches?.[0]
    if (!match) return { status: 'clean' }

    return {
      status: 'flagged',
      reason: `Google Safe Browsing lists this address for ${THREAT_LABELS[match.threatType] ?? 'a known threat'}.`,
    }
  } catch {
    return { status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

export async function checkUrl(input) {
  const parsed = parseHost(input)
  if (parsed === null) {
    return { verdict: null, explanation: 'That does not look like a web address. Paste the whole link, including the domain.' }
  }

  const safeBrowsing = await checkSafeBrowsing(parsed.url)
  const lookalike = checkLookalike(parsed.host)
  const hostClass = classifyHost(parsed.host)

  const notes = []
  if (safeBrowsing.status === 'unconfigured') {
    notes.push('The Safe Browsing database is not configured on this site, so only the pattern checks ran.')
  } else if (safeBrowsing.status === 'error') {
    notes.push('The Safe Browsing database could not be reached, so only the pattern checks ran.')
  }

  if (safeBrowsing.status === 'flagged') {
    return { verdict: 'Suspicious/Flagged', explanation: safeBrowsing.reason, host: parsed.host, notes }
  }
  if (lookalike) {
    return { verdict: 'Suspicious/Flagged', explanation: lookalike.reason, host: parsed.host, notes }
  }
  if (hostClass) {
    return { verdict: 'Suspicious/Flagged', explanation: hostClass.reason, host: parsed.host, notes }
  }

  return {
    verdict: 'Safe',
    explanation:
      safeBrowsing.status === 'clean'
        ? 'Not listed in Google Safe Browsing, and it does not imitate a known modding or gaming platform.'
        : 'It does not imitate a known modding or gaming platform, and it is not a link shortener, tunnel host or anonymous file drop.',
    host: parsed.host,
    notes,
  }
}
