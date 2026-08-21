import Seo from '../components/Seo.jsx'
import { FileGlyph, FingerprintGlyph, NoEyeGlyph } from '../components/GlyphIcons.jsx'

const items = [
  {
    Icon: FileGlyph,
    title: 'What ModGuard reads',
    body: 'ModGuard scans the mod or game file you point it at, on your Mac, before you install it. It does not read other files, folders, or accounts on your machine.',
  },
  {
    Icon: FingerprintGlyph,
    title: 'What ModGuard sends',
    body: 'To check a file against known threats, ModGuard sends a fingerprint of the file, not the file itself, to our scanning service. The contents of your mods and game files never leave your machine.',
  },
  {
    Icon: NoEyeGlyph,
    title: 'What ModGuard does not collect',
    body: 'No account is required to scan a file, and ModGuard does not track browsing history, installed software, or personal information.',
  },
]

export default function Privacy() {
  return (
    <section className="doc doc--wide">
      <Seo
        title="ModGuard Privacy Policy"
        description="What ModGuard reads and sends when it scans a mod or game file, and what it never collects."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Privacy</h1>

        <div className="doc-cards">
          {items.map((item) => (
            <div className="doc-card" key={item.title}>
              <span className="doc-card__icon">
                <item.Icon />
              </span>
              <h2 className="doc-card__title">{item.title}</h2>
              <p className="doc-card__body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
