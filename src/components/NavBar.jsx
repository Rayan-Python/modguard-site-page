import { Fragment, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link
          to="/"
          className="nav__brand"
          aria-label="ModGuard home"
          onClick={close}
        >
          <img src="/logo.png" alt="" className="nav__mark" />
          <span className="nav__name">ModGuard</span>
        </Link>

        <button
          type="button"
          className="nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav__toggle-bar" />
          <span className="nav__toggle-bar" />
          <span className="nav__toggle-bar" />
        </button>

        <nav
          className={`nav__links${open ? ' nav__links--open' : ''}`}
          aria-label="Primary"
        >
          {links.map((link, i) => (
            <Fragment key={link.to}>
              {i > 0 && <span className="nav__divider" aria-hidden="true" />}
              <NavLink to={link.to} className="nav__link" onClick={close}>
                {link.label}
              </NavLink>
            </Fragment>
          ))}
          <span className="nav__divider" aria-hidden="true" />
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Report%20an%20issue`}
            className="nav__link"
            onClick={close}
          >
            Report an issue
          </a>
          <span className="nav__divider" aria-hidden="true" />
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=ModGuard%20feedback`}
            className="nav__link"
            onClick={close}
          >
            Feedback
          </a>
        </nav>
      </div>
    </header>
  )
}
