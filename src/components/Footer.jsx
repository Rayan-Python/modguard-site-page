import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__brand-row">
              <img src="/logo.png" alt="" className="footer__mark" />
              <span className="footer__name">ModGuard</span>
            </div>
            <p className="footer__blurb">
              Scan mods and game files for malware before you install them.
            </p>
          </div>
        </div>

        <Link to="/free" className="footer__link">
          Why free?
        </Link>

        {/* Legal disclaimer, kept small and muted */}
        <p className="footer__disclaimer">
          ModGuard is a detection tool, not a guarantee.
        </p>

        <p className="footer__copyright">
          © {new Date().getFullYear()} ModGuard. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
