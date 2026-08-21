import Seo from '../components/Seo.jsx'
import FeedbackForm from '../components/FeedbackForm.jsx'

function Dot() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 L10 17 L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const POINTS = [
  'A real person reads every message.',
  'Bug reports get looked at fast.',
  'We reply by email, so we need yours.',
]

export default function Contact() {
  return (
    <section className="contact">
      <Seo
        title="Contact ModGuard"
        description="Get support, report a bug, or send feedback about ModGuard. Every message reaches the team."
      />
      <div className="container contact__grid">
        <div className="contact__intro">
          <p className="contact__eyebrow">Contact</p>
          <h1 className="contact__title">
            Let’s
            <br />
            talk.
          </h1>
          <p className="contact__lede">
            Questions, bugs, or ideas all reach the ModGuard team.
          </p>
          <ul className="contact__points">
            {POINTS.map((p) => (
              <li className="contact__point" key={p}>
                <span className="contact__point-icon">
                  <Dot />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="contact__panel">
          <FeedbackForm />
        </div>
      </div>
    </section>
  )
}
