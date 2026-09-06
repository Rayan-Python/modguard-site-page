import Seo from '../components/Seo.jsx'
import { RELEASE_TAG } from '../data/release.js'

// Newest release first. Add new entries at the top of this array as they ship.
// The current entry's version comes from src/data/release.js so the changelog,
// the download link and the packaged app can never disagree.
const entries = [
  {
    version: RELEASE_TAG,
    date: null,
    current: true,
    changes: [
      'Rebuilt detection: Java bytecode analysis across 28 behaviour categories, replacing text pattern matching',
      'Nested jars are now judged on whether the mod declares them, so ordinary bundled libraries stop being flagged as droppers',
      'Filename check compares the extension against the file\u2019s actual contents',
      'Live watch runs a mod in a sandboxed game with decoy credentials to see what it actually takes',
      'Reputation verification against Modrinth and GitHub fingerprints',
      'Findings are discounted for properly built, signed mod packages, cutting false positives',
    ],
  },
  {
    version: 'v1.9.0',
    date: null,
    current: false,
    changes: ['Improved detection accuracy and verification', 'Updated UI'],
  },
  {
    version: 'v1.0.0',
    date: null,
    current: false,
    changes: ['Initial release'],
  },
]

export default function Version() {
  return (
    <section className="doc doc--panel">
      <Seo
        title="ModGuard Version History & Changelog"
        description="The full version history and changelog for ModGuard, the free game mod malware scanner."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Version</h1>

        <ul className="doc__entries">
          {entries.map((entry) => (
            <li className="doc__entry" key={entry.version}>
              <div className="doc__entry-head">
                <span className="doc__entry-version">{entry.version}</span>
                {entry.current && (
                  <span className="doc__entry-badge">Current</span>
                )}
                {entry.date && (
                  <span className="doc__entry-date">{entry.date}</span>
                )}
              </div>
              <ul className="doc__entry-notes">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
