/**
 * URL checking: Google Safe Browsing lookup plus the structural and
 * lookalike-domain heuristics ModGuard applies to a link before you follow it.
 *
 * The rules here are written to answer one question — "is this the site it looks
 * like it is?" — and to say which signal fired, because "flagged" on its own
 * tells someone nothing they can act on.
 *
 * Every rule is combination-gated wherever the individual parts are ordinary.
 * A subdomain is ordinary. A link shortener is ordinary. A page on vercel.app is
 * ordinary. What is not ordinary is a login path for Steam on a domain Valve
 * does not own, and that is the shape these rules are built around.
 */

const SAFE_BROWSING_KEY = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_API_KEY

export const isSafeBrowsingConfigured = Boolean(SAFE_BROWSING_KEY)

/**
 * Parse whatever was pasted into the parts the rules need. A bare host gets an
 * https:// so `new URL` will take it; everything downstream reads the parsed
 * pieces rather than the raw text.
 */
export function parseHost(input) {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.hostname === '') return null
    // A path with broken percent-encoding still belongs to a real address, so a
    // decode that throws falls back to the raw text rather than rejecting the
    // whole link as unreadable.
    let path
    try {
      path = decodeURIComponent(url.pathname)
    } catch {
      path = url.pathname
    }
    return {
      url: url.href,
      host: url.hostname.toLowerCase(),
      path: path.toLowerCase(),
      params: url.searchParams,
      protocol: url.protocol,
      // "https://steamcommunity.com@evil.com" is a link to evil.com. Everything
      // before the @ is a username, and it is there to be misread.
      hasUserInfo: url.username !== '' || url.password !== '',
    }
  } catch {
    return null
  }
}

const stripWww = (host) => host.replace(/^www\./, '')

const isExactOrSubdomain = (host, domain) => host === domain || host.endsWith(`.${domain}`)

// Suffixes where the registrable name is the third label from the right, so
// "steamcommunity.co.uk" is read as a domain rather than as "co.uk".
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'gov.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au',
  'com.br', 'net.br', 'org.br',
  'co.jp', 'ne.jp', 'or.jp',
  'com.cn', 'net.cn', 'org.cn',
  'co.kr', 'or.kr',
  'com.mx', 'com.ar', 'com.co', 'com.pe',
  'co.za', 'org.za',
  'com.tr', 'com.tw', 'com.hk', 'com.sg', 'com.my', 'com.ph', 'com.vn',
  'co.in', 'net.in', 'org.in',
  'com.ua', 'com.pl', 'com.ru', 'net.ru', 'org.ru',
  'co.nz', 'net.nz', 'org.nz',
  'co.il', 'com.es', 'com.pt', 'com.gr', 'com.ro',
])

/** The part somebody actually registered: "verify-account.xyz", "bbc.co.uk". */
export function registrableDomain(host) {
  const labels = stripWww(host).split('.')
  if (labels.length <= 2) return labels.join('.')
  const lastTwo = labels.slice(-2).join('.')
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.')
  return lastTwo
}

/** The labels in front of the registrable domain. */
const subdomainLabels = (host) => {
  const bare = stripWww(host)
  const registrable = registrableDomain(bare)
  if (bare === registrable) return []
  return bare.slice(0, -(registrable.length + 1)).split('.').filter(Boolean)
}

const brandOf = (domain) => domain.split('.')[0] ?? domain

// --- the platforms worth imitating -------------------------------------------

/**
 * `compoundIsSuspicious` marks the brands specific enough that wrapping them in
 * a longer name means something. It is off for Minecraft, Roblox and Discord on
 * purpose: minecraftforum.net, robloxfansite.com and discordbotlist.com are
 * ordinary community sites, and a rule that calls them phishing is a rule people
 * learn to ignore. The scam-keyword and login-path rules still cover the cases
 * that matter for those three.
 */
const PLATFORMS = [
  { domain: 'steamcommunity.com', label: 'Steam Community', terms: ['steamcommunity', 'steam'], compoundIsSuspicious: true },
  { domain: 'curseforge.com', label: 'CurseForge', terms: ['curseforge'], compoundIsSuspicious: true },
  { domain: 'modrinth.com', label: 'Modrinth', terms: ['modrinth'], compoundIsSuspicious: true },
  { domain: 'epicgames.com', label: 'Epic Games', terms: ['epicgames', 'fortnite'], compoundIsSuspicious: true },
  { domain: 'discord.com', label: 'Discord', terms: ['discord'], compoundIsSuspicious: false },
  { domain: 'roblox.com', label: 'Roblox', terms: ['roblox'], compoundIsSuspicious: false },
  { domain: 'minecraft.net', label: 'Minecraft', terms: ['minecraft', 'mojang'], compoundIsSuspicious: false },
]

/**
 * Well-known community sites that trip the keyword rules for honest reasons.
 * steamgifts.com runs giveaways and says so; steamdb.info is a Steam database.
 * A hand-kept list is the plain way to say "we know about this one" — it does
 * not scale, and it is not meant to: it is for the handful of sites big enough
 * that a false alarm on them would be noticed.
 */
const KNOWN_GOOD_COMMUNITY = [
  'steamgifts.com', 'steamdb.info', 'steamrep.com', 'steamladder.com', 'barter.vg',
  'planetminecraft.com', 'minecraftforum.net', 'namemc.com', 'modpacks.ch',
  'discordbotlist.com', 'top.gg', 'disboard.org',
]

// Domains the same operators really own. A match here is never a lookalike.
const PLATFORM_SIBLINGS = [
  'steampowered.com', 'steamstatic.com', 'steamusercontent.com', 'steamgames.com', 'valvesoftware.com',
  'forgecdn.net', 'cursemaven.com', 'curseforge.overwolf.com', 'overwolf.com',
  'discordapp.com', 'discordapp.net', 'discord.gg', 'discordstatus.com', 'discord.media',
  'rbxcdn.com', 'roblox.qq.com', 'rbxweb.com',
  'unrealengine.com', 'epicgames.dev', 'fortnite.com', 'easyanticheat.net',
  'mojang.com', 'minecraftservices.com', 'minecraft.com', 'minecraftforge.net',
  'modrinth.gg', 'fabricmc.net', 'neoforged.net', 'quiltmc.org', 'papermc.io',
]

/** Is this host the real thing, or a subdomain of it? */
function platformFor(host) {
  const bare = stripWww(host)
  for (const platform of PLATFORMS) {
    if (isExactOrSubdomain(bare, platform.domain)) return platform
  }
  return null
}

export function isTrustedPlatformHost(host) {
  const bare = stripWww(host)
  if (platformFor(bare) !== null) return true
  return PLATFORM_SIBLINGS.some((sibling) => isExactOrSubdomain(bare, sibling))
}

const isKnownGoodCommunity = (host) =>
  KNOWN_GOOD_COMMUNITY.some((domain) => isExactOrSubdomain(stripWww(host), domain))

// Words as a reader sees them, split on the separators a domain and a path use.
// It is the difference between "steam" in "secure-login-steam.gg", which is the
// site announcing itself as Steam, and "steam" in "steampunk-blog.com", which is
// a different word that happens to start the same way.
const namedTokens = (host, path) =>
  new Set([
    ...stripWww(host).split(/[.\-_]/).filter(Boolean),
    ...path.split(/[/\-_.]/).filter(Boolean),
  ])

// --- lookalike scoring --------------------------------------------------------

/**
 * Fold the characters attackers swap for ones that read the same. `i` and `l`
 * both fold to `l`, which is what makes "steamcommunlty" and "steamcommunity"
 * come out identical — the substitution a reader's eye slides straight over.
 */
const CONFUSABLE = new Map([
  ['0', 'o'], ['1', 'l'], ['i', 'l'], ['!', 'l'], ['|', 'l'],
  ['2', 'z'], ['3', 'e'], ['4', 'a'], ['5', 's'], ['6', 'b'],
  ['7', 't'], ['8', 'b'], ['9', 'g'], ['$', 's'], ['@', 'a'],
])

export function skeleton(value) {
  const digraphs = value.replace(/rn/g, 'm').replace(/vv/g, 'w')
  let out = ''
  for (const character of digraphs) out += CONFUSABLE.get(character) ?? character
  return out
}

/**
 * Optimal string alignment: Levenshtein that also counts a swap of two adjacent
 * characters as one edit rather than two. "discrod" and "cursefroge" are typed
 * by accident every day, which is exactly why they get registered on purpose.
 */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const rows = []
  for (let i = 0; i <= a.length; i++) rows.push(i === 0 ? Array.from({ length: b.length + 1 }, (_, j) => j) : [i])
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2][j - 2] + 1)
      }
      rows[i][j] = best
    }
  }
  return rows[a.length][b.length]
}

/**
 * How far off a name may be and still be called a typosquat.
 *
 * Short names are the reason this scales. Two edits away from "roblox" reaches
 * real words; two edits away from "steamcommunity" reaches nothing anybody
 * registered by accident. Being generous here is how a checker ends up telling
 * people that a small mod host is a phishing site.
 */
const allowedDistance = (length) => (length >= 10 ? 2 : length >= 5 ? 1 : 0)

const alphanumeric = (value) => value.replace(/[^a-z0-9]/g, '')

/**
 * Does this host imitate one of the platforms? Returns the most specific reason
 * that applies, or null.
 */
export function checkLookalike(host) {
  const bare = stripWww(host)
  if (isTrustedPlatformHost(bare)) return null

  const registrable = registrableDomain(bare)
  const brand = brandOf(registrable)
  const brandFlat = alphanumeric(brand)
  const subdomains = subdomainLabels(bare)

  for (const platform of PLATFORMS) {
    const platformBrand = brandOf(platform.domain)
    const platformFlat = alphanumeric(platformBrand)

    // The real name pushed into a subdomain: steamcommunity.com.verify.xyz
    const spoofedSubdomain = subdomains.some(
      (label) => label === platformBrand || alphanumeric(label) === platformFlat || label === platform.domain.replace('.', '-'),
    )
    if (spoofedSubdomain) {
      return {
        id: 'subdomain-spoof',
        reason: `"${platform.domain}" appears only as a subdomain here. The domain this address actually belongs to is ${registrable}, which is not ${platform.label}.`,
      }
    }

    if (registrable === platform.domain) continue

    // Same name, different ending: steamcommunity.net / .ru / .cn
    if (brand === platformBrand) {
      return {
        id: 'wrong-tld',
        reason: `This is ${platform.label}'s name on the wrong ending — the real address is ${platform.domain}, not ${registrable}.`,
      }
    }

    // Same letters, punctuation added: steam-community.com
    if (brandFlat === platformFlat) {
      return {
        id: 'punctuation-variant',
        reason: `This spells ${platform.label}'s name with punctuation added (${registrable}). The real address is ${platform.domain}.`,
      }
    }

    // Same shape once the confusable characters are folded: steamcommunlty.com
    if (skeleton(brandFlat) === skeleton(platformFlat)) {
      return {
        id: 'homoglyph',
        reason: `This domain closely resembles ${platform.domain} but is not the real domain — it swaps in characters that look the same at a glance (${registrable}).`,
      }
    }

    // A name that contains the platform's own, spelled correctly, is a compound
    // rather than a misspelling — "9minecraft" is not a typo of "minecraft", it
    // is a different name with that word in it. Compounds are judged by the
    // compound rule below, which knows that Minecraft's name is in a thousand
    // honest domains and CurseForge's is not.
    const isCompound = brandFlat !== platformFlat && brandFlat.includes(platformFlat)

    if (!isCompound || platform.compoundIsSuspicious) {
      const distance = Math.min(
        editDistance(brandFlat, platformFlat),
        editDistance(skeleton(brandFlat), skeleton(platformFlat)),
      )
      if (distance > 0 && distance <= allowedDistance(platformFlat.length)) {
        return {
          id: 'typosquat',
          reason: `This domain closely resembles ${platform.domain} but is not the real domain — it is ${distance} character${distance === 1 ? '' : 's'} different (${registrable}).`,
        }
      }
    }

    // The name wrapped in a longer one: curseforge-downloads.com
    if (isCompound && platform.compoundIsSuspicious) {
      return {
        id: 'brand-in-longer-domain',
        reason: `This wraps ${platform.label}'s name in a longer domain (${registrable}) that ${platform.label} does not own.`,
      }
    }
  }

  return null
}

// --- "free robux" and friends -------------------------------------------------

const GIVEAWAY_WORDS = [
  'free', 'giveaway', 'generator', 'claim', 'redeem', 'reward', 'promo', 'bonus',
  'unlimited', 'hack', 'cheat', 'glitch', 'winner',
]
// Currencies that mean one thing only, so a giveaway word beside them is enough.
const NAMED_CURRENCY = ['robux', 'vbucks', 'v-bucks', 'minecoins', 'nitro']
// Currencies that are ordinary words elsewhere, so these need a platform named too.
const GENERIC_CURRENCY = ['gems', 'coins', 'credits', 'skins', 'cases', 'giftcard', 'gift']
const PLATFORM_TERMS = [
  'roblox', 'fortnite', 'epicgames', 'steam', 'steamcommunity', 'discord',
  'minecraft', 'curseforge', 'modrinth', 'csgo', 'valorant',
]

/**
 * What separates buying currency from being robbed of it.
 *
 * Every real way to get robux, V-Bucks or Minecoins ends at a payment: a card,
 * PayPal, or a gift card redeemed on the platform's own site. That step is the
 * whole product. A page offering the same currency for nothing has to replace it
 * with something, and it is always one of these — sign in, fill in a survey,
 * install an app, "verify you are human" — none of which move any money, because
 * the thing being collected is the account.
 *
 * So the presence of a real payment path is what tells a shop from a scam, and
 * the presence of a gate where the payment should be is what confirms one.
 */
const PAYMENT_SIGNALS = [
  'checkout', 'cart', 'payment', 'paypal', 'stripe', 'billing', 'invoice', 'order',
  'purchase', 'buy', 'pricing', 'price', 'subscribe', 'visa', 'mastercard', 'klarna',
]
const REWARD_GATES = [
  'survey', 'offerwall', 'offers', 'complete-offer', 'completeoffer', 'human-verification',
  'humanverification', 'verify-human', 'nosurvey', 'no-survey', 'noverification',
  'no-verification', 'unlock', 'install-app', 'installapp', 'download-app', 'downloadapp',
  'getapp', 'earn', 'tasks',
]
const CREDENTIAL_GATES = ['login', 'signin', 'sign-in', 'log-in', 'password', 'account', 'auth', 'verify', 'verification']

const found = (haystack, words) => words.filter((word) => haystack.includes(word))

/**
 * The giveaway scam, which is a combination rather than any single word: an
 * offer, a currency, and a platform that is not the one hosting the page.
 */
/**
 * A currency always has to be named. An offer plus a platform is not enough on
 * its own — steamgifts.com runs giveaways for Steam games and is exactly that
 * shape — so the rule holds out for the thing being handed over.
 */
export function checkGiveawayScam(host, path) {
  if (isKnownGoodCommunity(host)) return null
  const haystack = `${stripWww(host)}${path}`
  const giveaway = found(haystack, GIVEAWAY_WORDS)
  const named = found(haystack, NAMED_CURRENCY)
  const generic = found(haystack, GENERIC_CURRENCY)
  const platforms = found(haystack, PLATFORM_TERMS)
  const currency = [...named, ...generic]

  const gates = found(haystack, REWARD_GATES)
  const credentials = found(haystack, CREDENTIAL_GATES)
  const payment = found(haystack, PAYMENT_SIGNALS)

  // Currency named on somebody else's domain behind a sign-in. The "free" claim
  // does not have to be written down for this one: asking for a game login on a
  // domain that game does not own is the whole attack, and the currency is only
  // the reason given for it.
  if (currency.length > 0 && platforms.length > 0 && credentials.length > 0) {
    return {
      id: 'currency-credential-gate',
      reason: `This asks for ${platforms[0]} login details on a domain ${platforms[0]} does not own, in order to hand out ${currency[0]}. A real ${currency[0]} purchase is a payment, never a sign-in on somebody else's site.`,
    }
  }

  if (giveaway.length > 0 && currency.length > 0 && platforms.length === 0 && named.length === 0) {
    return null
  }

  // The offer, the currency, and no way to pay for any of it.
  if (giveaway.length > 0 && named.length > 0) {
    const gated = gates.length > 0 || credentials.length > 0
    return {
      id: gated ? 'currency-scam-gated' : 'giveaway-scam',
      reason: gated
        ? `This offers "${giveaway[0]} ${named[0]}" and puts a "${gates[0] ?? credentials[0]}" step where the payment would be. ${named[0]} is only ever sold for money, so a page that asks for anything else is collecting it, not giving it away.`
        : `This offers "${giveaway[0]} ${named[0]}" on a domain that does not belong to the game it names — the standard free-currency scam, which takes your account instead.`,
    }
  }
  if (named.length > 0 && platforms.length > 0 && payment.length === 0) {
    return {
      id: 'giveaway-scam',
      reason: `This offers ${named[0]} on a domain that is not ${platforms[0]}'s own, with no sign of an actual payment step. ${named[0]} is only ever sold by ${platforms[0]} itself.`,
    }
  }
  if (giveaway.length > 0 && generic.length > 0 && platforms.length > 0) {
    return {
      id: 'giveaway-scam',
      reason: `This combines "${giveaway[0]}", "${generic[0]}" and ${platforms[0]} on a domain ${platforms[0]} does not own — the shape of a free-item scam.`,
    }
  }
  return null
}

// --- pages that claim to be a platform ---------------------------------------

const LOGIN_PATH =
  /(^|[/\-_])(login|log-in|signin|sign-in|logon|auth|oauth|openid|account|accounts|verify|verification|confirm|secure|session|password|recover|unlock|claim|redeem|checkout|billing|wallet)([/\-_.]|$)/

const hasLoginShape = (path) => LOGIN_PATH.test(path)

/**
 * A browser-in-the-browser attack draws a fake sign-in window inside an ordinary
 * page, so the address bar never changes and there is no second URL to check.
 * What can be checked is the page underneath: if it is asking you to sign in to
 * Steam, it has to be on Steam's domain, and this one is not.
 */
export function checkPlatformImpersonation(host, path) {
  if (isTrustedPlatformHost(host) || isKnownGoodCommunity(host)) return null
  if (!hasLoginShape(path) && !hasLoginShape(stripWww(host))) return null

  const tokens = namedTokens(host, path)
  for (const platform of PLATFORMS) {
    if (!platform.terms.some((term) => tokens.has(term))) continue
    return {
      id: 'platform-impersonation',
      reason: `This is a ${platform.label} sign-in page on ${stripWww(host)}, which ${platform.label} does not own. A real ${platform.label} login only ever happens on ${platform.domain}, whatever the window on the page looks like.`,
    }
  }
  return null
}

// --- structural red flags -----------------------------------------------------

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const BARE_NUMBER = /^\d{7,}$/
const HEX_HOST = /^0x[0-9a-f]+$/i

const CREDENTIAL_PARAMS = ['password', 'passwd', 'pwd', 'pass']
const IDENTITY_PARAMS = ['email', 'mail', 'user', 'username', 'login', 'account']
const REDIRECT_PARAMS = ['redirect', 'redirect_uri', 'redirecturl', 'redir', 'return', 'returnurl', 'next', 'continue', 'goto', 'dest', 'destination', 'target', 'url', 'link']
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const MAX_ORDINARY_SUBDOMAINS = 3

export function checkStructure(host, params, path, hasUserInfo = false) {
  const bare = stripWww(host)

  if (hasUserInfo) {
    return {
      id: 'userinfo-host',
      reason: `Everything before the "@" in this address is a username, not a destination — the site it actually opens is ${registrableDomain(bare)}.`,
    }
  }

  if (bare.startsWith('[') || bare.includes(':')) {
    return { id: 'ip-host', reason: 'This address points at a raw IPv6 address rather than a domain name, so there is no registered owner to check.' }
  }
  if (IPV4.test(bare)) {
    return { id: 'ip-host', reason: 'This address points at a raw IP address rather than a domain name — it cannot be looked up or reported the way a domain can.' }
  }
  if (BARE_NUMBER.test(bare) || HEX_HOST.test(bare)) {
    return { id: 'ip-host', reason: 'This address writes its destination as a plain number, which is a way of spelling an IP address that hides what it points at.' }
  }
  if (bare.startsWith('xn--') || bare.includes('.xn--')) {
    return { id: 'punycode', reason: 'This address uses a punycode domain, which can display as letters it does not actually contain — a common way to fake a familiar name.' }
  }

  const credential = CREDENTIAL_PARAMS.find((name) => params.has(name))
  if (credential !== undefined) {
    return { id: 'credential-param', reason: `This link carries a "${credential}" value in the address itself. No real sign-in page passes a password that way.` }
  }

  for (const name of IDENTITY_PARAMS) {
    const value = params.get(name)
    if (value !== null && EMAIL_SHAPE.test(value)) {
      return { id: 'prefilled-identity', reason: 'This link arrives with an email address already filled in, which is how a phishing page makes its sign-in form look like yours.' }
    }
  }

  for (const name of REDIRECT_PARAMS) {
    const value = params.get(name)
    if (value === null) continue
    let target
    try {
      target = new URL(value)
    } catch {
      continue
    }
    if (!/^https?:$/.test(target.protocol)) continue
    if (registrableDomain(target.hostname.toLowerCase()) === registrableDomain(bare)) continue
    return {
      id: 'redirect-chain',
      reason: `This link hands off to another site (${target.hostname}) through its "${name}" setting, so where it ends up is not the address you are looking at.`,
    }
  }

  const subdomains = subdomainLabels(bare)
  if (subdomains.length >= MAX_ORDINARY_SUBDOMAINS) {
    return {
      id: 'excessive-subdomains',
      reason: `This address stacks ${subdomains.length} names in front of ${registrableDomain(bare)}, which is how a familiar word is made to appear at the start of an address that does not belong to it.`,
    }
  }

  return null
}

// --- hosting that is free to take and hard to take down ----------------------

// Free static hosting and app platforms. Every one of these hosts a great deal
// of honest work, so being on one is not a finding by itself.
const FREE_HOSTING = [
  '000webhostapp.com', 'blogspot.com', 'wixsite.com', 'weebly.com', 'glitch.me',
  'repl.co', 'replit.app', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev',
  'web.app', 'firebaseapp.com', 'github.io', 'gitlab.io', 'herokuapp.com',
  'onrender.com', 'surge.sh', 'neocities.org', 'altervista.org', 'ucoz.ru',
  'epizy.com', 'rf.gd', 'wuaze.com', 'great-site.net', 'ct8.pl', 'infinityfreeapp.com',
  'byethost.com', 'sites.google.com', 'notion.site', 'framer.website', 'webflow.io',
]

// Somebody's own machine put on the internet, or a tunnel to it. These are not
// services anybody runs a real download from.
const DYNAMIC_DNS = [
  'duckdns.org', 'no-ip.com', 'no-ip.org', 'no-ip.biz', 'ddns.net', 'hopto.org',
  'ngrok.io', 'ngrok-free.app', 'ngrok.app', 'trycloudflare.com', 'loca.lt',
  'serveo.net', 'localtunnel.me', 'zapto.org', 'sytes.net', 'myftp.org', 'ip-ddns.com',
]

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'shorturl.at', 'rb.gy', 'cutt.ly',
  'goo.gl', 'ow.ly', 'buff.ly', 'adf.ly', 'shorte.st', 'bl.ink', 's.id', 'tiny.cc',
  't.ly', 'snip.ly', 'rebrand.ly', 'shrtco.de', 'clck.ru', 'v.gd', 'trib.al',
]

const FILE_DROPS = [
  'pastebin.com', 'hastebin.com', 'paste.ee', 'ghostbin.com', 'termbin.com', '0x0.st',
  'transfer.sh', 'file.io', 'anonfiles.com', 'gofile.io', 'catbox.moe', 'litterbox.catbox.moe',
  'mediafire.com', 'pixeldrain.com', 'limewire.com', 'mega.nz', 'mega.io', 'wetransfer.com',
  'we.tl', 'filebin.net', 'bashupload.com', 'uguu.se', 'tmpfiles.org', 'krakenfiles.com',
  'dropmefiles.com',
]

const onAnyOf = (host, list) => list.find((entry) => isExactOrSubdomain(stripWww(host), entry)) ?? null

/**
 * Free hosting is only a finding next to a reason for it to be there: a platform
 * named in the address, or a sign-in path. Plenty of real projects live on
 * github.io, and none of them are asking anybody to log in to Steam.
 */
export function checkAbusedHosting(host, path) {
  const provider = onAnyOf(host, FREE_HOSTING)
  if (provider === null) return null

  const haystack = `${stripWww(host)}${path}`
  const platform = PLATFORM_TERMS.find((term) => haystack.includes(term))
  const login = hasLoginShape(path)
  if (platform === undefined && !login) return null

  return {
    id: 'abused-hosting',
    reason: platform !== undefined
      ? `This is a free-hosting page on ${provider} using ${platform}'s name. Anybody can put a page there under any name, and ${platform} does not publish from it.`
      : `This is a sign-in page on free hosting (${provider}), which anybody can create under any name.`,
  }
}

/** Host classes that say something about the address on their own. */
export function classifyHost(host) {
  const bare = stripWww(host)

  const tunnel = onAnyOf(bare, DYNAMIC_DNS)
  if (tunnel !== null) {
    return { id: 'dynamic-dns', reason: `This is a dynamic-DNS or tunnel host (${tunnel}) — someone's own computer exposed to the internet, not a real service.` }
  }

  const drop = onAnyOf(bare, FILE_DROPS)
  if (drop !== null) {
    return { id: 'file-drop', reason: `This is an anonymous paste or file-drop service (${drop}) — a common place to park a payload.` }
  }

  const shortener = onAnyOf(bare, SHORTENERS)
  if (shortener !== null) {
    return {
      id: 'shortener',
      severity: 'unverified',
      reason: `This is a shortened link (${shortener}), so the address it ends up at cannot be read from the link itself. That is not a problem in itself — it is a reason to know where it goes before you follow it.`,
    }
  }

  return null
}

// --- Google Safe Browsing -----------------------------------------------------

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

// --- putting it together ------------------------------------------------------

/**
 * Every signal that fired, most specific first. The order is what decides the
 * one line somebody reads, so it runs from "this is pretending to be a named
 * site" down to "this hides where it goes".
 */
export function inspectUrl(parsed) {
  const { host, path, params, hasUserInfo } = parsed
  const signals = []
  const push = (signal) => {
    if (signal !== null && signal !== undefined) signals.push(signal)
  }

  // A real platform domain is not imitating anything, so only the checks that
  // still apply to a genuine site run: an open redirect, a password in the
  // address or a borrowed name before an "@" is worth saying wherever it appears.
  if (isTrustedPlatformHost(host)) {
    push(checkStructure(host, params, path, hasUserInfo))
    return signals.filter((signal) =>
      ['credential-param', 'redirect-chain', 'prefilled-identity', 'userinfo-host'].includes(signal.id),
    )
  }

  push(checkLookalike(host))
  push(checkGiveawayScam(host, path))
  push(checkPlatformImpersonation(host, path))
  push(checkAbusedHosting(host, path))
  push(checkStructure(host, params, path, hasUserInfo))
  push(classifyHost(host))
  return signals
}

/**
 * What each signal is worth on the 0–99 dial the three tools share.
 *
 * A shortener sits deliberately low: it is a fact about a link, not an
 * accusation, and it should never on its own push the needle into the red.
 */
const SIGNAL_WEIGHTS = {
  'safe-browsing': 99,
  'currency-credential-gate': 88,
  'platform-impersonation': 80,
  'userinfo-host': 80,
  homoglyph: 78,
  'wrong-tld': 74,
  'subdomain-spoof': 74,
  'punctuation-variant': 70,
  typosquat: 70,
  'currency-scam-gated': 80,
  'giveaway-scam': 66,
  'brand-in-longer-domain': 52,
  'credential-param': 58,
  punycode: 55,
  'abused-hosting': 52,
  'prefilled-identity': 48,
  'ip-host': 44,
  'redirect-chain': 44,
  'dynamic-dns': 38,
  'excessive-subdomains': 34,
  'file-drop': 32,
  // Low, but deliberately over the line into "worth a look": a dial reading
  // "Safe" above a sentence saying the destination cannot be checked would be
  // telling the reader two different things at once.
  shortener: 32,
}

const MAX_URL_SCORE = 99
// Where "nothing checked this" sits on the dial: past Safe, since nothing
// earned that word, but below every score a real pattern match produces —
// this is silence, not evidence, and it should read as the lightest thing in
// the caution band rather than compete with an actual finding.
const CANNOT_CONFIRM_SCORE = 30

/**
 * The strongest signal sets the score; anything else on top of it adds a little.
 * Two independent reasons to distrust a link are worse than one, but a pile of
 * weak ones should never add up to a certainty on their own.
 */
export function scoreSignals(signals) {
  if (signals.length === 0) return 0
  const weights = signals.map((signal) => SIGNAL_WEIGHTS[signal.id] ?? 30).sort((a, b) => b - a)
  const [leading = 0, ...rest] = weights
  const support = rest.reduce((sum, weight) => sum + Math.round(weight * 0.15), 0)
  return Math.min(MAX_URL_SCORE, leading + support)
}

export const verdictForScore = (score) => (score >= 60 ? 'Malicious' : score >= 30 ? 'Suspicious' : 'Safe')

export async function checkUrl(input) {
  const parsed = parseHost(input)
  if (parsed === null) {
    return {
      verdict: null,
      riskScore: null,
      explanation: 'That does not look like a web address. Paste the whole link, including the domain.',
      signals: [],
    }
  }

  const safeBrowsing = await checkSafeBrowsing(parsed.url)

  const notes = []
  if (safeBrowsing.status === 'unconfigured') {
    notes.push('The Safe Browsing database is not configured on this site, so only the pattern checks ran.')
  } else if (safeBrowsing.status === 'error') {
    notes.push('The Safe Browsing database could not be reached, so only the pattern checks ran.')
  }

  if (safeBrowsing.status === 'flagged') {
    return {
      verdict: 'Malicious',
      riskScore: MAX_URL_SCORE,
      explanation: safeBrowsing.reason,
      host: parsed.host,
      notes,
      signals: ['safe-browsing'],
      severity: 'flagged',
    }
  }

  const signals = inspectUrl(parsed)
  const leading = signals[0]

  if (leading !== undefined) {
    const riskScore = scoreSignals(signals)
    // A shortener on its own is not an accusation, so it is reported as the one
    // thing it is: an address whose destination nobody can read yet.
    const severity = signals.every((signal) => signal.severity === 'unverified') ? 'unverified' : 'flagged'
    return {
      verdict: verdictForScore(riskScore),
      riskScore,
      explanation: leading.reason,
      host: parsed.host,
      notes,
      signals: signals.map((signal) => signal.id),
      severity,
    }
  }

  // "Nothing looked wrong" is only "Safe" when something actually checked it
  // against an outside source. When Safe Browsing did not run, "nothing looked
  // wrong" means only that this page's own pattern rules found nothing — and a
  // pattern list can always miss something it has never seen before. Calling
  // that "Safe" hands the reader a confidence the check never earned, so it
  // says "unconfirmed" instead, at the bottom of the caution band rather than
  // in the clear.
  if (safeBrowsing.status === 'clean') {
    return {
      verdict: 'Safe',
      riskScore: 0,
      explanation: 'Not listed in Google Safe Browsing, and it does not imitate a known gaming or modding platform.',
      host: parsed.host,
      notes,
      signals: [],
      severity: 'safe',
    }
  }

  return {
    verdict: 'Unverified',
    riskScore: CANNOT_CONFIRM_SCORE,
    explanation:
      'ModGuard could not check this against a threat database, and its own pattern checks found nothing wrong — but that is not the same as confirming it is safe. Proceed with caution and verify the source independently before you follow it.',
    host: parsed.host,
    notes,
    signals: [],
    severity: 'unverified',
  }
}
