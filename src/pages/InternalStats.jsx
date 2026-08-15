import useDownloadCount from '../hooks/useDownloadCount.js'

// Not linked from nav or footer. Visit /internal-stats directly to check.
export default function InternalStats() {
  const count = useDownloadCount()

  return (
    <section className="doc doc--panel">
      <div className="container doc__inner">
        <h1 className="doc__title">Internal stats</h1>
        <p className="doc__body">
          Total downloads across all GitHub releases:{' '}
          {count === null ? 'loading…' : count.toLocaleString()}
        </p>
      </div>
    </section>
  )
}
