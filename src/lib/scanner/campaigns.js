/**
 * Names that published analyses tie to one particular malware campaign and to
 * nothing else. A match is a marker, never a verdict on its own: a tool written
 * to clean a campaign up carries the same names as text.
 *
 * Each indicator says where it counts. A package prefix found as a class name is
 * the campaign's own code; the same string found only in a comment is not.
 */

export const CAMPAIGNS = [
  {
    id: 'weedhack',
    name: 'WeedHack',
    active: 'January 2026 to now',
    what: 'A malware-as-a-service stealer shipped inside mods and clients. It takes your Minecraft session, launcher logins, browser passwords and crypto wallets, then fetches a second stage whose address it looks up on the Ethereum blockchain.',
    source: 'https://0xresetti.github.io/weedhack.html',
    indicators: [
      { value: 'dev/majanito', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'me/mclauncher/StagingHelper', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'me/mclauncher/IMCL', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'me/mclauncher/MEntrypoint', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'me/mclauncher/LoaderClient', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'cc/rshift/RShiftClient', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'initializeWeedhack', sites: ['string', 'referenced-class'] },
      { value: 'WeedhackFile', sites: ['string'] },
      { value: '0x1280a841fbc1f883365d3c83122260e0b2995b74', sites: ['string'] },
      { value: '1280a841fbc1f883365d3c83122260e0b2995b74', sites: ['string'] },
      { value: 'whnewreceive.ru', sites: ['host', 'string'] },
      { value: 'whreceive.ru', sites: ['host', 'string'] },
      { value: 'whreceiver.ru', sites: ['host', 'string'] },
      { value: 'receiver.cy', sites: ['host', 'string'] },
      { value: 'weedhack.cy', sites: ['host', 'string'] },
      { value: 'marsalek.cy', sites: ['host', 'string'] },
      { value: 'huehnchenfarm.ru', sites: ['host', 'string'] },
      { value: '45.141.119.34', sites: ['host', 'string'] },
      { value: '43072760-0388-4d20-83c3-edcc17b3391a', sites: ['string', 'entry'] },
      { value: 'a125e430-2459-4702-9797-49fce5f280ae', sites: ['string', 'entry'] },
      { value: 'c4f763d6-e34c-42e9-bba1-b80cfa5a55df', sites: ['string', 'entry'] },
      { value: '2fbff058-173d-4ba3-adaf-95a757636fc5', sites: ['string', 'entry'] },
      { value: 'grshiftcart', sites: ['string'] },
      { value: 'JavaSecurityUpdater', sites: ['string'] },
      { value: 'Mod init state: M', sites: ['string'] },
    ],
  },
  {
    id: 'fractureiser',
    name: 'fractureiser',
    active: 'April to June 2023, contained',
    what: 'The campaign that got into CurseForge and BukkitDev. It infected every other Minecraft jar on the machine, then took Microsoft account tokens, Discord logins, browser passwords and the clipboard.',
    source: 'https://github.com/fractureiser-investigation/fractureiser/blob/main/docs/tech.md',
    indicators: [
      { value: 'dev/neko/nekoclient', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'dev/neko/e/e/e', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'Java_dev_neko_nekoclient_api_windows_WindowsHook_retrieveMSACredentials', sites: ['string'] },
      { value: 'libWebGL64.jar', sites: ['string', 'entry'] },
      { value: 'dummyloader3.jar', sites: ['string', 'entry'] },
      { value: 'MicrosoftEdgeUpdateTaskMachineVM', sites: ['string'] },
      { value: 'microsoft-vm-core', sites: ['string', 'entry'] },
      { value: '/etc/systemd/system/vmd-gnu.service', sites: ['string'] },
      { value: '85.217.144.130', sites: ['host', 'string'] },
      { value: '107.189.3.101', sites: ['host', 'string'] },
      { value: '95.214.27.172', sites: ['host', 'string'] },
      { value: 'files-8ie.pages.dev', sites: ['host', 'string'] },
      { value: 'connect.skyrage.de', sites: ['host', 'string'] },
      { value: 't23e7v6uz8idz87ehugwq.skyrage.de', sites: ['host', 'string'] },
      { value: '_d1385bd3c36f464882460aa4f0484c53', sites: ['string'] },
      { value: '_f7dba6a3a72049a78a308a774a847180', sites: ['string'] },
    ],
  },
  {
    id: 'stargazers-minecraft',
    name: 'the Stargazers Minecraft mods',
    active: 'March 2025 onward',
    what: 'Around 500 GitHub repositories posing as popular cheats and clients. A Java loader that hides from virtual machines, then a Java stealer for your Minecraft and Discord accounts, then a .NET stealer for everything else.',
    source: 'https://research.checkpoint.com/2025/minecraft-mod-malware-stargazers/',
    indicators: [
      { value: 'me/baikal/club', sites: ['class-name', 'referenced-class', 'entry'] },
      { value: 'pastebin.com/raw/xca3vsip', sites: ['string', 'host'] },
      { value: '147.45.79.104', sites: ['host', 'string'] },
      { value: '185.95.159.125', sites: ['host', 'string'] },
    ],
  },
  {
    id: 'spigot-plugin-worm',
    name: 'the Spigot plugin worm',
    active: 'seen since 2023',
    what: 'A worm that copies itself into every other plugin jar beside it on a server, so a plugin that was fine when you installed it is not fine now.',
    source: 'https://github.com/gitvitox/Eclipse-Worm',
    indicators: [{ value: 'plugin-config.bin', sites: ['entry', 'string'] }],
  },
]

/**
 * Which campaigns this file carries markers for. `structural` means the marker
 * is a class the file is built out of, not a name mentioned in passing.
 */
export function matchCampaigns({ classNames, referencedClasses, strings, entryPaths, hosts }) {
  const sites = {
    'class-name': classNames,
    'referenced-class': referencedClasses,
    entry: entryPaths,
    string: strings,
    host: hosts,
  }
  const results = []

  for (const campaign of CAMPAIGNS) {
    const matches = []
    for (const indicator of campaign.indicators) {
      for (const site of indicator.sites) {
        const haystack = sites[site] ?? []
        const found = haystack.find((value) => value.includes(indicator.value))
        if (found === undefined) continue
        matches.push({ found: indicator.value, site })
        break
      }
    }
    if (matches.length === 0) continue
    const structural = matches.some((match) => match.site === 'class-name' || match.site === 'referenced-class')
    results.push({ campaign, matches, structural })
  }
  return results
}
