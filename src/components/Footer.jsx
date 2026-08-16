import { Link } from 'react-router-dom'

const INSTAGRAM_URL = 'https://www.instagram.com/modguard_protections/'
const LINKEDIN_URL =
  'https://www.linkedin.com/company/modguard-protections/posts/?feedView=all'

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <line x1="8" y1="11" x2="8" y2="16.5" />
      <circle cx="8" cy="7.9" r="0.6" fill="currentColor" stroke="none" />
      <path d="M11.5 16.5 V11 M11.5 13 C11.5 11.6 12.6 11 13.8 11 C15.1 11 16 11.9 16 13.4 V16.5" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__content">
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

        <div className="footer__social">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ModGuard on Instagram"
          >
            <InstagramIcon />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ModGuard on LinkedIn"
          >
            <LinkedInIcon />
          </a>
        </div>
      </div>
    </footer>
  )
}
