export default function Terms() {
  return (
    <section className="doc">
      <div className="container doc__inner">
        <h1 className="doc__title">Terms</h1>

        <h2 className="doc__heading">Use at your own risk</h2>
        <p className="doc__body">
          ModGuard flags files it believes are unsafe, but no scanner catches
          everything. A "safe" result is not a guarantee, and you're
          responsible for what you choose to install.
        </p>

        <h2 className="doc__heading">No warranty</h2>
        <p className="doc__body">
          ModGuard is provided as-is, without warranty of any kind, express or
          implied.
        </p>

        <h2 className="doc__heading">Acceptable use</h2>
        <p className="doc__body">
          Don't use ModGuard to scan or redistribute files you don't have the
          rights to, and don't attempt to reverse engineer or abuse the
          scanning service.
        </p>

        <h2 className="doc__heading">Changes</h2>
        <p className="doc__body">
          These terms may be updated as ModGuard changes. Continued use means
          you accept the current version.
        </p>
      </div>
    </section>
  )
}
