export default function Privacy() {
  return (
    <section className="doc doc--panel">
      <div className="container doc__inner">
        <h1 className="doc__title">Privacy</h1>

        <h2 className="doc__heading">What ModGuard reads</h2>
        <p className="doc__body">
          ModGuard scans the mod or game file you point it at, on your Mac,
          before you install it. It does not read other files, folders, or
          accounts on your machine.
        </p>

        <h2 className="doc__heading">What ModGuard sends</h2>
        <p className="doc__body">
          To check a file against known threats, ModGuard sends a fingerprint
          of the file, not the file itself, to our scanning service. The
          contents of your mods and game files never leave your machine.
        </p>

        <h2 className="doc__heading">What ModGuard does not collect</h2>
        <p className="doc__body">
          No account is required to scan a file, and ModGuard does not track
          browsing history, installed software, or personal information.
        </p>
      </div>
    </section>
  )
}
