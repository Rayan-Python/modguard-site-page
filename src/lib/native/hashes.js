/**
 * ModGuard's own hash lists for native files.
 *
 * Deliberately our own, and deliberately almost empty. The reference
 * implementation we looked at for technique ships a hash-db.json containing
 * `{"knownBad": {}, "knownGood": {}}` — no data at all — so there was nothing to
 * inherit even if inheriting it were a good idea.
 *
 * A hash list is only worth what its provenance is worth. Every entry here has
 * to be a hash somebody can recompute and check for themselves, which is why the
 * only seed entry is EICAR: the industry's standard "does your scanner's
 * detection path actually fire" string, published for exactly this purpose. It
 * is not malware and it is not pretending to be.
 *
 * Adding a real entry means having the sample, hashing it, and recording where
 * it came from in `note`. Inventing plausible-looking hashes to make the list
 * look populated would make the scanner confidently wrong, which is worse than
 * an empty list.
 */

export const KNOWN_BAD = new Map([
  [
    '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
    {
      name: 'EICAR standard antivirus test file',
      note: 'The published test string every scanner is supposed to detect. Harmless — it exists to prove the detection path works.',
      severity: 'test',
    },
  ],
])

/**
 * Files we can positively vouch for. Signed, widely distributed mod loaders
 * belong here once their hashes are recorded from a verified download; until
 * then it stays empty rather than guessing.
 */
export const KNOWN_GOOD = new Map()

/**
 * Look a digest up in both lists.
 * `unknown` is the normal answer and means nothing either way.
 */
export function lookupHash(digest) {
  const bad = KNOWN_BAD.get(digest)
  if (bad !== undefined) return { verdict: 'known-bad', ...bad }
  const good = KNOWN_GOOD.get(digest)
  if (good !== undefined) return { verdict: 'known-good', ...good }
  return { verdict: 'unknown' }
}

export const hashListSizes = () => ({ bad: KNOWN_BAD.size, good: KNOWN_GOOD.size })
