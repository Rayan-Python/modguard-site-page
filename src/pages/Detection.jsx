import Seo from '../components/Seo.jsx'
import DetectionVisualizer from '../components/DetectionVisualizer.jsx'

export default function Detection() {
  return (
    <section className="doc doc--panel">
      <Seo
        title="How ModGuard Sees a Mod"
        description="An interactive look at how ModGuard analyzes a mod file, step by step, from filename checks to reputation matching."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">How ModGuard sees a mod</h1>
        <p className="doc__lede">
          See exactly how ModGuard analyzes a file, step by step.
        </p>

        <DetectionVisualizer />
      </div>
    </section>
  )
}
