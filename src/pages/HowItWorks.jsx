import { Fragment } from 'react'
import Seo from '../components/Seo.jsx'
import {
  DownloadGlyph,
  ScanGlyph,
  ShieldCheckGlyph,
} from '../components/GlyphIcons.jsx'

const steps = [
  {
    n: '1',
    Icon: DownloadGlyph,
    title: 'Download a file',
    body: 'Grab any mod or game file from a forum, marketplace, or friend.',
  },
  {
    n: '2',
    Icon: ScanGlyph,
    title: 'ModGuard scans it',
    body: 'Point ModGuard at the file. It checks for malware and suspicious behavior.',
  },
  {
    n: '3',
    Icon: ShieldCheckGlyph,
    title: 'Safe or blocked',
    body: 'Get a clear result before anything runs. Install with confidence, or walk away.',
  },
]

function Arrow() {
  return (
    <li className="flow__arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
        <path
          d="M4 12 H19 M13.5 6 L19.5 12 L13.5 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </li>
  )
}

export default function HowItWorks() {
  return (
    <section className="doc doc--wide">
      <Seo
        title="How ModGuard Scans Game Mods for Malware"
        description="See how ModGuard, a free game mod malware scanner, checks files before you install them, in three simple steps."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">How it works</h1>
        <p className="doc__lede">
          Not every mod or game file is what it claims to be. ModGuard checks
          before you install, and gives you a plain answer.
        </p>

        <ol className="flow">
          {steps.map((step, i) => (
            <Fragment key={step.n}>
              <li className="flow__step">
                <span className="flow__badge">
                  <step.Icon />
                </span>
                <span className="flow__label">Step {step.n}</span>
                <h3 className="flow__title">{step.title}</h3>
                <p className="flow__body">{step.body}</p>
              </li>
              {i < steps.length - 1 && <Arrow />}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  )
}
