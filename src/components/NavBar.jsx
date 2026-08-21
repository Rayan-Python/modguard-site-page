import { Fragment, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/detection', label: 'Detection' },
  { to: '/team', label: 'Team' },
  { to: '/version', label: 'Version' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
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
        </nav>
      </div>
    </header>
  )
}
