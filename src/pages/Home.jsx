import Seo from '../components/Seo.jsx'

const DMG_URL =
  'https://github.com/Rayan-Python/modguard-site-page/releases/download/v3.0.0/ModGuard-1.28.0-universal.dmg'

function AppleIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.152 6.896c-.948 0-2.415-1.077-3.96-1.045-2.04.034-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.16-3.677 1.163-4.61 1.163zm3.803-3.454c.843-1.012 1.4-2.427 1.245-3.833-1.207.052-2.662.805-3.532 1.817-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.698"
      />
    </svg>
  )
}

function WindowsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3 5.5 10.4 4.5V11.3H3V5.5ZM11.3 4.4 21 3V11.2H11.3V4.4ZM3 12.3H10.4V19.1L3 18.1V12.3ZM11.3 12.3H21V20.5L11.3 19.2V12.3Z"
      />
    </svg>
  )
}

function ScrollCue() {
  return (
    <div className="scroll-cue" aria-hidden="true">
      <span className="scroll-cue__label">Scroll to download</span>
      <svg
        className="scroll-cue__chevron"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9 L12 15 L18 9" />
      </svg>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <Seo
        title="ModGuard: Minecraft Mod Scanner & Game File Malware Checker"
        description="ModGuard is a free malware scanner for Minecraft mods and other game files. Scan before you install, for any game, not just one."
      />

      <section className="hero">
        <img src="/logo.png" alt="" className="hero__watermark" />
        <div className="hero__inner">
          <p className="hero__eyebrow">Making Gaming Safer.</p>
          <h1 className="hero__headline">
            Scan mods.
            <br />
            Play safe.
          </h1>
          <p className="hero__subtext">
            Catch malware before it catches you.
          </p>
        </div>
        <ScrollCue />
      </section>

      <section className="download">
        <div className="download__inner">
          <h2 className="download__heading">Download ModGuard</h2>
          <p className="download__sub">
            Available now for macOS. Windows coming soon.
          </p>

          <div className="download__cards">
            <div className="dl-card">
              <AppleIcon className="dl-card__icon" />
              <span className="dl-card__label">macOS</span>
              <a className="dl-card__btn dl-card__btn--active" href={DMG_URL}>
                Download for Mac
              </a>
            </div>

            <div className="dl-card dl-card--disabled">
              <WindowsIcon className="dl-card__icon" />
              <span className="dl-card__label">Windows</span>
              <span
                className="dl-card__btn dl-card__btn--soon"
                title="Windows support is coming September 15."
              >
                Coming September 15
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
