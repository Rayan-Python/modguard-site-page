import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <span className="footer__name">ModGuard</span>
            <p className="footer__blurb">
              Scan mods and game files for malware before you install them.
            </p>
          </div>

          <nav className="footer__links" aria-label="Footer">
            <Link to="/faq" className="footer__link">
              FAQ
            </Link>
            <Link to="/security" className="footer__link">
              Security
            </Link>
          </nav>
        </div>

        {/* Legal disclaimer, kept small and muted */}
        <p className="footer__disclaimer">
          ModGuard is a detection tool, not a guarantee. Verify mod sources
          yourself before installing.
        </p>

        <p className="footer__copyright">
          © {new Date().getFullYear()} ModGuard. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
