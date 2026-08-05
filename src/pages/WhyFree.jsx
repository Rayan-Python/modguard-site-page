import Seo from '../components/Seo.jsx'

export default function WhyFree() {
  return (
    <section className="doc doc--panel">
      <Seo
        title="Why Is ModGuard Free?"
        description="ModGuard is free because gamers shouldn't have to pay for basic safety. Here's how we plan to keep it that way."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Why is ModGuard free?</h1>
        <p className="doc__lede">
          ModGuard is free because gamers shouldn't have to pay for basic
          safety. We're not selling user data, and we don't run ads.
        </p>
        <p className="doc__body">
          Our long-term plan is to grow ModGuard's reach and eventually
          partner with or be acquired by a larger platform in the gaming or
          security space, similar to how many open-source security tools
          sustain themselves. Until then, ModGuard stays free.
        </p>
      </div>
    </section>
  )
}
