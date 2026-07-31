import { SECURITY_EMAIL } from '../data/contact.js'

export default function Security() {
  return (
    <section className="doc doc--panel">
      <div className="container doc__inner">
        <h1 className="doc__title">Security</h1>
        <p className="doc__lede">
          Found a vulnerability in ModGuard itself, not a false positive in a
          scanned file? Let us know.
        </p>

        <h2 className="doc__heading">Report privately</h2>
        <p className="doc__body">
          Email{' '}
          <a href={`mailto:${SECURITY_EMAIL}`} className="doc__link">
            {SECURITY_EMAIL}
          </a>{' '}
          with steps to reproduce. Please hold off on public disclosure until
          we've had a chance to fix it.
        </p>

        <h2 className="doc__heading">Response time</h2>
        <p className="doc__body">
          We aim to acknowledge reports within a few business days.
        </p>
      </div>
    </section>
  )
}
