import { Link, NavLink } from 'react-router-dom'
import { SUPPORT_EMAIL, FEEDBACK_EMAIL } from '../data/contact.js'

export default function NavBar() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="ModGuard home">
          <img src="/logo.png" alt="" className="nav__mark" />
          <span className="nav__name">ModGuard</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          {/* About the product */}
          <NavLink to="/how-it-works" className="nav__link">
            How it works
          </NavLink>
          <NavLink to="/team" className="nav__link">
            Team
          </NavLink>
          <NavLink to="/free" className="nav__link">
            Why free?
          </NavLink>
          <NavLink to="/version" className="nav__link">
            Version
          </NavLink>

          {/* Legal / trust */}
          <NavLink to="/privacy" className="nav__link">
            Privacy
          </NavLink>
          <NavLink to="/terms" className="nav__link">
            Terms
          </NavLink>
          <NavLink to="/security" className="nav__link">
            Security
          </NavLink>

          {/* Support */}
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
