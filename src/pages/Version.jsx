const entries = [
  {
    version: 'v0.1',
    date: 'Unreleased',
    notes: ['First build of ModGuard for Mac.'],
  },
]

export default function Version() {
  return (
    <section className="doc doc--panel">
      <div className="container doc__inner">
        <h1 className="doc__title">Version</h1>

        <ul className="doc__entries">
          {entries.map((entry) => (
            <li className="doc__entry" key={entry.version}>
              <div className="doc__entry-head">
                <span className="doc__entry-version">{entry.version}</span>
                <span className="doc__entry-date">{entry.date}</span>
              </div>
              <ul className="doc__entry-notes">
                {entry.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
