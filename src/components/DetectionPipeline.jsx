import { useEffect, useRef, useState } from 'react'

// Self-contained horizontal detection pipeline for the /detection page.
// Stages fade/slide in on scroll-into-view, staggered ~150ms apart.

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M7 3 H14 L18 7 V21 H7 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3 V7 H18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <line x1="9.5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="9.5" y1="15.5" x2="15" y2="15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <line x1="15.3" y1="15.3" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="9" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12" y="12" width="9" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9.5 12v2a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M5 3v18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M5 4.5c3-1.4 5 1.4 8 0s5-1.4 5-1.4V13c0 0-2 1.4-5 1.4s-5-2.8-8-1.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowConnector() {
  return (
    <li className="pipeline__arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path
          d="M4 12 H19 M13.5 6 L19.5 12 L13.5 18"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </li>
  )
}

const STAGES = [
  { id: 'file', Icon: FileIcon, title: 'File' },
  {
    id: 'static',
    Icon: SearchIcon,
    title: 'Static Analysis',
    sub: 'Filename, commands, patterns',
  },
  {
    id: 'reputation',
    Icon: ShieldCheckIcon,
    title: 'Reputation Check',
    sub: 'Hash verification, known mods',
  },
  {
    id: 'fusion',
    Icon: MergeIcon,
    title: 'Risk Fusion',
    sub: 'Combines all signals',
  },
  {
    id: 'verdict',
    Icon: FlagIcon,
    title: 'Verdict',
    sub: 'Safe / Suspicious / Malicious',
  },
]

export default function DetectionPipeline() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <ol className={`pipeline${visible ? ' pipeline--visible' : ''}`} ref={ref}>
      {STAGES.map((stage, i) => (
        <li key={stage.id} className="pipeline__item">
          <div
            className="pipeline__stage"
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            <span className="pipeline__icon">
              <stage.Icon />
            </span>
            <span className="pipeline__title">{stage.title}</span>
            {stage.sub && <span className="pipeline__sub">{stage.sub}</span>}
          </div>
          {i < STAGES.length - 1 && <ArrowConnector />}
        </li>
      ))}
    </ol>
  )
}
