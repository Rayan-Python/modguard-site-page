import Seo from '../components/Seo.jsx'
import {
  DocCheckGlyph,
  ScanGlyph,
  InfoGlyph,
  ScaleGlyph,
  UserGlyph,
  DeviceGlyph,
  DatabaseGlyph,
  ExternalGlyph,
  MinorsGlyph,
  RefreshGlyph,
  MailGlyph,
} from '../components/GlyphIcons.jsx'

const items = [
  {
    n: '01',
    Icon: DocCheckGlyph,
    title: 'Acceptance of Terms',
    body: "By using ModGuard, you agree to these terms. If you don't, don't use it.",
  },
  {
    n: '02',
    Icon: ScanGlyph,
    title: 'What ModGuard Does',
    body: 'ModGuard scans mod files, and sometimes watches activity while a game runs, for malware and suspicious behavior. A clean scan means no known threats were found, not a guarantee.',
  },
  {
    n: '03',
    Icon: InfoGlyph,
    title: 'No Warranty',
    body: 'ModGuard is provided "as is," with no warranties. We can’t guarantee it catches every threat or works on every system.',
  },
  {
    n: '04',
    Icon: ScaleGlyph,
    title: 'Limitation of Liability',
    body: 'We aren’t liable for any damage, data loss, or account loss from using ModGuard, including a missed threat or a false result.',
  },
  {
    n: '05',
    Icon: UserGlyph,
    title: 'User Responsibility',
    body: 'Use your own judgment when installing mods. ModGuard is an extra safety layer, not a replacement for checking sources yourself.',
  },
  {
    n: '06',
    Icon: DeviceGlyph,
    title: 'Device and System Access',
    body: (
      <>
        ModGuard accesses only what it needs to scan a file, including watching
        a running game. It never collects unrelated data. See our{' '}
        <a href="/privacy" className="doc__link">
          Privacy Policy
        </a>
        .
      </>
    ),
  },
  {
    n: '07',
    Icon: DatabaseGlyph,
    title: 'Data Collection',
    body: (
      <>
        We may keep scan results, like threats found and file metadata, to
        improve detection. Never personal files or credentials. See our{' '}
        <a href="/privacy" className="doc__link">
          Privacy Policy
        </a>
        .
      </>
    ),
  },
  {
    n: '08',
    Icon: ExternalGlyph,
    title: 'Third-Party Mods',
    body: "ModGuard scans content we don’t own or control. We’re responsible for our detection, not for the mods themselves.",
  },
  {
    n: '09',
    Icon: MinorsGlyph,
    title: 'Minors',
    body: "If you’re a minor, get a parent or guardian’s permission before using ModGuard.",
  },
  {
    n: '10',
    Icon: RefreshGlyph,
    title: 'Changes to These Terms',
    body: 'These terms may change as ModGuard evolves. Continuing to use it means you accept the updates.',
  },
  {
    n: '11',
    Icon: MailGlyph,
    title: 'Contact',
    body: (
      <>
        Questions about these terms? Reach us through the{' '}
        <a href="/contact" className="doc__link">
          Contact tab
        </a>{' '}
        up top.
      </>
    ),
  },
]

export default function Terms() {
  return (
    <section className="doc doc--wide">
      <Seo
        title="ModGuard Terms & Conditions"
        description="The terms and conditions for using ModGuard to scan game mods and files for malware."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Terms &amp; Conditions</h1>

        <div className="doc-cards">
          {items.map((item) => (
            <div className="doc-card" key={item.n}>
              <div className="doc-card__head">
                <span className="doc-card__icon">
                  <item.Icon />
                </span>
                <span className="doc-card__num">{item.n}</span>
              </div>
              <h2 className="doc-card__title">{item.title}</h2>
              <p className="doc-card__body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
