import { Link, NavLink } from 'react-router-dom'
import { SUPPORT_EMAIL, FEEDBACK_EMAIL } from '../data/contact.js'

export default function NavBar() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="ModGuard home">
          <span className="nav__mark" aria-hidden="true">
            {/* Logo placeholder, swap for real ModGuard logo later */}
            <svg viewBox="0 0 32 32" width="26" height="26">
              <path
                d="M16 3 L27 7 V16 C27 23 22 28 16 29.5 C10 28 5 23 5 16 V7 Z"
                fill="currentColor"
              />
              <path
                d="M11 16.5 L14.5 20 L21.5 12"
                fill="none"
                stroke="#0d0d0d"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="nav__name">ModGuard</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          <NavLink to="/how-it-works" className="nav__link">
            How it works
          </NavLink>
          <NavLink to="/privacy" className="nav__link">
            Privacy
          </NavLink>
          <NavLink to="/version" className="nav__link">
            Version
          </NavLink>
          <NavLink to="/terms" className="nav__link">
            Terms
          </NavLink>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Report%20an%20issue`}
            className="nav__link"
          >
            Report an issue
          </a>
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=ModGuard%20feedback`}
            className="nav__link"
          >
            Feedback
          </a>
        </nav>
      </div>
    </header>
  )
}
