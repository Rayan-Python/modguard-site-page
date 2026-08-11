import { Fragment } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SUPPORT_EMAIL, FEEDBACK_EMAIL } from '../data/contact.js'

const links = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/team', label: 'Team' },
  { to: '/version', label: 'Version' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
]

export default function NavBar() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="ModGuard home">
          <img src="/logo.png" alt="" className="nav__mark" />
          <span className="nav__name">ModGuard</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          {links.map((link, i) => (
            <Fragment key={link.to}>
              {i > 0 && <span className="nav__divider" aria-hidden="true" />}
              <NavLink to={link.to} className="nav__link">
                {link.label}
              </NavLink>
            </Fragment>
          ))}
          <span className="nav__divider" aria-hidden="true" />
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Report%20an%20issue`}
            className="nav__link"
          >
            Report an issue
          </a>
          <span className="nav__divider" aria-hidden="true" />
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
