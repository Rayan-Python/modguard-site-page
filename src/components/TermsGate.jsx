import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * A clickwrap acknowledgment: the visitor has to tick the box and press the
 * button before the site is usable. It is deliberately not dismissible — no
 * outside click, no Escape — because a dismissible box is a banner, and a banner
 * is not agreement.
 *
 * Bumping TERMS_VERSION changes the storage key, so a visitor who accepted an
 * earlier version is asked again rather than being carried over in silence.
 */
const TERMS_VERSION = 'v1'
const ACCEPTED_KEY = `modguard_tos_accepted_${TERMS_VERSION}`
const ACCEPTED_AT_KEY = `modguard_tos_accepted_at_${TERMS_VERSION}`

// Filled in once the Terms & Conditions have a real effective date.
const EFFECTIVE_DATE = '[Date]'

// Every line below is the existing Terms & Conditions and Privacy Policy
// wording, shortened but not rewritten. New legal language does not belong in a
// summary of language that already exists.
const SUMMARY = [
  {
    title: 'ModGuard is a detection tool, not a guarantee',
    body: 'A clean scan means no known threats were found, not a guarantee. ModGuard is provided "as is," and we can’t guarantee it catches every threat or works on every system.',
  },
  {
    title: 'Check where your mods come from',
    body: 'Use your own judgment when installing mods. ModGuard is an extra safety layer, not a replacement for checking sources yourself.',
  },
  {
    title: 'What is collected',
    body: 'To check a file against known threats, ModGuard sends a fingerprint of the file, not the file itself. The contents of your mods and game files never leave your machine, and no account is required to scan one.',
  },
]

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled)'

function hasAccepted() {
  try {
    return window.localStorage.getItem(ACCEPTED_KEY) === 'true'
  } catch {
    // Private browsing, or site data blocked. Nothing is remembered, so the
    // acknowledgment is asked for again — never skipped.
    return false
  }
}

export default function TermsGate() {
  const [open, setOpen] = useState(() => !hasAccepted())
  const [agreed, setAgreed] = useState(false)
  const dialogRef = useRef(null)
  const checkboxRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    checkboxRef.current?.focus()
    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    // Escape must not close it, and Tab must not reach the page behind it.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? [])]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  function accept() {
    if (!agreed) return
    try {
      // Kept on this browser only, as our own record of when it was agreed to.
      window.localStorage.setItem(ACCEPTED_KEY, 'true')
      window.localStorage.setItem(ACCEPTED_AT_KEY, new Date().toISOString())
    } catch {
      /* nothing to remember it with; the visit still goes ahead */
    }
    setOpen(false)
  }

  return (
    <div className="gate" role="presentation">
      <div
        className="gate__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        aria-describedby="gate-lede"
        ref={dialogRef}
      >
        <div className="gate__doc-header">
          <p className="gate__doc-kicker">ModGuard</p>
          <h2 className="gate__doc-title" id="gate-title">
            Terms &amp; Conditions Summary
          </h2>
          <p className="gate__doc-date">Effective {EFFECTIVE_DATE}</p>
        </div>

        <p className="gate__lede" id="gate-lede">
          This is a summary of our Terms &amp; Conditions and Privacy Policy. Read the full
          documents any time — they are linked below.
        </p>

        <ol className="gate__points">
          {SUMMARY.map((point) => (
            <li className="gate__point" key={point.title}>
              <h3 className="gate__point-title">{point.title}</h3>
              <p className="gate__point-body">{point.body}</p>
            </li>
          ))}
        </ol>

        <p className="gate__links">
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="gate__link">
            Full Terms &amp; Conditions
          </Link>
          <span className="gate__links-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="gate__link">
            Full Privacy Policy
          </Link>
        </p>

        <label className="gate__agree" htmlFor="gate-agree">
          <input
            id="gate-agree"
            type="checkbox"
            className="gate__checkbox"
            ref={checkboxRef}
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span>I have read and agree to the Terms &amp; Conditions and Privacy Policy.</span>
        </label>

        <button type="button" className="gate__submit" onClick={accept} disabled={!agreed}>
          Continue
        </button>
      </div>
    </div>
  )
}
