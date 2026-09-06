import { useRef, useState } from 'react'
import Seo from '../components/Seo.jsx'
import { scanFile } from '../lib/modScanner.js'
import { checkUrl } from '../lib/urlChecker.js'

const VERDICT_CLASS = {
  Safe: 'tool__verdict--safe',
  Suspicious: 'tool__verdict--sus',
  'Suspicious/Flagged': 'tool__verdict--sus',
  Malicious: 'tool__verdict--bad',
}

function Verdict({ verdict, explanation, children }) {
  return (
    <div className="tool__result">
      {verdict && (
        <span className={`tool__verdict ${VERDICT_CLASS[verdict] ?? ''}`}>{verdict}</span>
      )}
      <p className="tool__explanation">{explanation}</p>
      {children}
    </div>
  )
}

const VERDICT_TONE = {
  Safe: 'tool__verdict--safe',
  Suspicious: 'tool__verdict--sus',
  Malicious: 'tool__verdict--bad',
}

function RiskScore({ verdict, riskScore }) {
  if (riskScore === null) return null
  return (
    <div className="tool__score">
      <div className="tool__score-head">
        <span className={`tool__verdict ${VERDICT_TONE[verdict] ?? ''}`}>{verdict}</span>
        <span className="tool__score-value">
          <strong>{riskScore}</strong>
          <span className="tool__score-max"> / 100</span>
        </span>
      </div>
      <div
        className="tool__meter"
        role="img"
        aria-label={`Risk score ${riskScore} out of 100: ${verdict}`}
      >
        <span
          className={`tool__meter-fill ${VERDICT_TONE[verdict] ?? ''}`}
          style={{ width: `${Math.max(2, riskScore)}%` }}
        />
      </div>
    </div>
  )
}

function ModScanner() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  async function handleScan() {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await scanFile(bytes, file.name))
    } catch (error) {
      setResult({
        verdict: null,
        riskScore: null,
        reasons: [],
        explanation: `This file could not be read: ${error?.message ?? error}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tool">
      <h2 className="tool__heading">Mod scanner</h2>
      <p className="tool__lede">
        Upload a <code>.jar</code> or a schematic. ModGuard reads the class files, the
        archive itself and the nested jars inside it, then scores what it finds on the same
        weighted categories the desktop app uses. Nothing leaves your browser.
      </p>

      <div className="tool__row">
        <input
          ref={inputRef}
          id="mod-file"
          type="file"
          accept=".jar,.zip,.litematic,.schem,.schematic,.nbt"
          className="tool__file"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            setResult(null)
          }}
        />
        <label htmlFor="mod-file" className="tool__file-label">
          {file ? file.name : 'Choose a file'}
        </label>
        <button
          type="button"
          className="tool__submit"
          onClick={handleScan}
          disabled={!file || busy}
        >
          {busy ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {result && (
        <div className="tool__result">
          <RiskScore verdict={result.verdict} riskScore={result.riskScore ?? null} />
          <p className="tool__explanation">{result.explanation}</p>
          {result.reasons?.length > 0 && (
            <ul className="tool__signals">
              {result.reasons.map((reason) => (
                <li className="tool__signal" key={reason.title + reason.text}>
                  <span className="tool__signal-check">{reason.title}</span>
                  <span className="tool__signal-detail">{reason.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="tool__note">
        The score and the reasons above are the headline. The full findings list, the file's
        fingerprint and its reputation against known-good and known-bad builds stay in the
        desktop app, along with the sandbox that watches a mod actually run.
      </p>
    </section>
  )
}

function UrlChecker() {
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleCheck() {
    if (value.trim() === '') return
    setBusy(true)
    setResult(null)
    try {
      setResult(await checkUrl(value))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tool">
      <h2 className="tool__heading">URL checker</h2>
      <p className="tool__lede">
        Paste a download link before you follow it. ModGuard checks it against Google Safe
        Browsing, then against the patterns that give away a fake Steam, CurseForge,
        Modrinth or Discord address.
      </p>

      <div className="tool__row">
        <input
          type="url"
          inputMode="url"
          className="tool__input"
          placeholder="https://example.com/download"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setResult(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleCheck()
          }}
        />
        <button
          type="button"
          className="tool__submit"
          onClick={handleCheck}
          disabled={value.trim() === '' || busy}
        >
          {busy ? 'Checking…' : 'Check'}
        </button>
      </div>

      {result && (
        <Verdict verdict={result.verdict} explanation={result.explanation}>
          {result.host && <p className="tool__host">Checked: {result.host}</p>}
          {result.notes?.map((note) => (
            <p className="tool__note" key={note}>
              {note}
            </p>
          ))}
        </Verdict>
      )}

      <p className="tool__note">
        This checks against known threat databases and common patterns. Always verify
        suspicious links independently.
      </p>
    </section>
  )
}

export default function SecurityTools() {
  return (
    <section className="doc doc--wide">
      <Seo
        title="Free Mod Scanner & URL Checker — ModGuard"
        description="Scan a Minecraft mod .jar or schematic for account stealers, droppers, hidden jars and auto-execute code, and check a download link against Google Safe Browsing and known typosquat patterns. Free, in your browser."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Security tools</h1>
        <p className="doc__lede">
          Two checks you can run right here, on the same detection logic as the desktop
          app. Neither replaces it — they are the parts that work without installing
          anything, and without the file ever leaving your browser.
        </p>

        <div className="tools">
          <ModScanner />
          <UrlChecker />
        </div>

        <div className="tools__cta">
          <p className="tools__cta-text">
            Want the full picture? Download ModGuard for real-time protection, reputation
            verification, and detailed threat analysis.
          </p>
          <a className="tools__cta-link" href="/#download">
            Download ModGuard
          </a>
        </div>
      </div>
    </section>
  )
}
