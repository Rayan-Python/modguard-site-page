import Seo from '../components/Seo.jsx'

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
      </section>
    </>
  )
}
