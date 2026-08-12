import Seo from '../components/Seo.jsx'

// Newest release first. Add new entries at the top of this array as they ship.
const entries = [
  {
    version: 'v2.0.0',
    date: null,
    current: true,
    changes: ['Updated UI', 'Improved detection accuracy'],
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
