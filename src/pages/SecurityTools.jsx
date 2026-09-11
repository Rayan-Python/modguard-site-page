import { useState } from 'react'
import RiskGauge from '../components/RiskGauge.jsx'
import Seo from '../components/Seo.jsx'
import ToolDisclaimer from '../components/ToolDisclaimer.jsx'
import { scanNativeFile } from '../lib/nativeScanner.js'
import { checkUrl } from '../lib/urlChecker.js'

/**
 * Every tool reports the same way: the dial, the verdict, one line of why, then
 * whatever detail that tool can add. A result with no score at all — an
 * unreadable file, a string that is not a URL — skips the dial and just says so.
 */
function Result({ verdict, riskScore, explanation, unit, children }) {
  return (
    <div className="tool__result">
      {riskScore === null || riskScore === undefined ? (
        <p className="tool__explanation">{explanation}</p>
      ) : (
        <RiskGauge score={riskScore} verdict={verdict} description={explanation} unit={unit} />
      )}
      {children}
    </div>
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
        <Result
          verdict={result.verdict}
          riskScore={result.riskScore ?? null}
          explanation={result.explanation}
          unit="Link risk score"
        >
          {result.host && <p className="tool__host">Checked: {result.host}</p>}
          {result.notes?.map((note) => (
            <p className="tool__note" key={note}>
              {note}
            </p>
          ))}
        </Result>
      )}

      <p className="tool__note">
        This checks against known threat databases and common patterns, including the
        "free robux / V-Bucks" giveaway pages that ask for a game login where a real
        purchase would ask for a payment.
      </p>
      <ToolDisclaimer />
    </section>
  )
}

function NativeScanner() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleScan() {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await scanNativeFile(bytes, file.name))
    } catch (error) {
      setResult({
        verdict: null,
        riskScore: null,
        findings: [],
        explanation: `This file could not be read: ${error?.message ?? error}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tool">
      <h2 className="tool__heading">Native mod scanner</h2>
      <p className="tool__lede">
        For the games the desktop app does not reach: Red Dead Redemption 2, Cyberpunk 2077,
        Watch Dogs, Assassin's Creed and the Bethesda titles. Upload a <code>.dll</code>,{' '}
        <code>.asi</code>, <code>.exe</code> or the archive you downloaded, and ModGuard
        reads the Windows headers, the strings and any nested archives for the injection,
        credential-theft and persistence patterns that mod menus and fake trainers are built
        from. Minecraft and Java mods are the desktop app's job — this is the native side it
        does not reach. Nothing leaves your browser.
      </p>

      <div className="tool__row">
        <input
          id="native-file"
          type="file"
          accept=".dll,.asi,.exe,.zip,.rar,.7z,.archive"
          className="tool__file"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            setResult(null)
          }}
        />
        <label htmlFor="native-file" className="tool__file-label">
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
        <Result
          verdict={result.verdict}
          riskScore={result.riskScore ?? null}
          explanation={result.explanation}
          unit="Native file risk score"
        >
          {result.game && (
            <p className="tool__host">Looks like a mod for: {result.game.label}</p>
          )}
          {result.findings?.length > 0 && (
            <ul className="tool__signals">
              {result.findings.map((finding) => (
                <li className="tool__signal" key={finding.id + finding.detail}>
                  <span className="tool__signal-check">{finding.title}</span>
                  <span className="tool__signal-detail">{finding.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Result>
      )}

      <p className="tool__note">
        Mod menus inject into the game by design, so injection on its own is reported rather
        than condemned. What moves the needle is injection next to something that has nothing
        to do with modding — reading your saved logins, posting to a webhook, or switching
        off Defender.
      </p>
      <ToolDisclaimer />
    </section>
  )
}

export default function SecurityTools() {
  return (
    <section className="doc doc--wide">
      <Seo
        title="Native Mod Scanner & URL Checker — ModGuard"
        description="Scan a .dll, .asi or .exe mod menu for Red Dead Redemption 2, Cyberpunk 2077, Watch Dogs, Assassin's Creed or Skyrim, and check a download link for typosquats and free-currency scams. Free, in your browser."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Security tools</h1>
        <p className="doc__lede">
          Two checks you can run right here, for the things the desktop app does not cover:
          native mod files for games outside Minecraft, and the link you were about to
          follow. Neither replaces the app, and neither file ever leaves your browser.
        </p>

        <div className="tools">
          <NativeScanner />
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
