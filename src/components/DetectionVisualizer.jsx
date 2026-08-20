import { useEffect, useRef, useState } from 'react'

// Self-contained "How ModGuard Sees a Mod" visualizer.
// Uses generalized, non-identifying example data, not real file contents.

const ANALYZERS = [
  {
    running: 'Checking filename…',
    pass: 'Filename looks normal',
    flag: 'Filename mimics a trusted mod',
  },
  {
    running: 'Checking for auto-execute patterns…',
    pass: 'No auto-execute hooks found',
    flag: 'Runs code automatically on load',
  },
  {
    running: 'Checking for hardcoded commands…',
    pass: 'No suspicious commands',
    flag: 'Contains hardcoded system commands',
  },
  {
    running: 'Checking reputation database…',
    pass: 'No known-bad matches',
    flag: 'Matches a known threat signature',
  },
]

const SCENARIOS = {
  safe: {
    label: 'A safe mod',
    file: 'aurora-shaders.mod',
    results: ['pass', 'pass', 'pass', 'pass'],
    verdict: 'safe',
  },
  malicious: {
    label: 'A malicious mod',
    file: 'unlimited-skins-unlocker.mod',
    results: ['pass', 'flag', 'flag', 'flag'],
    verdict: 'malicious',
  },
}

const STEP_MS = 700
const GAP_MS = 250

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 L10 17.5 L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 L21.5 20 H2.5 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10 V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.05" fill="currentColor" />
    </svg>
  )
}

function Spinner() {
  return <span className="detect__spinner" aria-hidden="true" />
}

export default function DetectionVisualizer() {
  const [scenarioKey, setScenarioKey] = useState(null)
  const [runId, setRunId] = useState(0)
  const [states, setStates] = useState(ANALYZERS.map(() => 'pending'))
  const [phase, setPhase] = useState('idle') // idle | running | done
  const timers = useRef([])

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function start(key) {
    setScenarioKey(key)
    setRunId((r) => r + 1)
  }

  useEffect(() => {
    if (!scenarioKey) return
    const scenario = SCENARIOS[scenarioKey]
    let cancelled = false
    clearTimers()
    setStates(ANALYZERS.map(() => 'pending'))
    setPhase('running')

    let i = 0
    const runStep = () => {
      if (cancelled) return
      setStates((prev) => prev.map((s, idx) => (idx === i ? 'running' : s)))
      timers.current.push(
        setTimeout(() => {
          if (cancelled) return
          setStates((prev) =>
            prev.map((s, idx) => (idx === i ? scenario.results[i] : s)),
          )
          i += 1
          if (i < ANALYZERS.length) {
            timers.current.push(setTimeout(runStep, GAP_MS))
          } else {
            timers.current.push(
              setTimeout(() => !cancelled && setPhase('done'), 450),
            )
          }
        }, STEP_MS),
      )
    }
    timers.current.push(setTimeout(runStep, 300))

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [scenarioKey, runId])

  const scenario = scenarioKey ? SCENARIOS[scenarioKey] : null

  return (
    <div className="detect">
      <div className="detect__controls" role="group" aria-label="Choose an example">
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            className={`detect__choice${scenarioKey === key ? ' detect__choice--on' : ''}`}
            onClick={() => start(key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!scenario ? (
        <p className="detect__hint">Pick an example above to run the analyzers.</p>
      ) : (
        <>
          <p className="detect__file">
            <span className="detect__file-label">Analyzing</span>
            <span className="detect__file-name">{scenario.file}</span>
          </p>

          <ul className="detect__steps">
            {ANALYZERS.map((analyzer, idx) => {
              const state = states[idx]
              const settled = state === 'pass' || state === 'flag'
              const text = settled ? analyzer[state] : analyzer.running
              return (
                <li
                  key={analyzer.running}
                  className={`detect__step detect__step--${state}`}
                >
                  <span className="detect__step-icon">
                    {state === 'running' && <Spinner />}
                    {state === 'pass' && <CheckIcon />}
                    {state === 'flag' && <WarnIcon />}
                  </span>
                  <span className="detect__step-text">
                    {state === 'pending' ? analyzer.running : text}
                  </span>
                </li>
              )
            })}
          </ul>

          {phase === 'done' && (
            <div className={`detect__verdict detect__verdict--${scenario.verdict}`}>
              <span className="detect__verdict-icon">
                {scenario.verdict === 'malicious' ? <WarnIcon /> : <CheckIcon />}
              </span>
              <span className="detect__verdict-text">
                {scenario.verdict === 'malicious' ? 'Confirmed Malicious' : 'Safe'}
              </span>
            </div>
          )}

          {phase === 'done' && (
            <button
              type="button"
              className="detect__again"
              onClick={() => start(scenarioKey)}
            >
              Run again
            </button>
          )}
        </>
      )}
    </div>
  )
}
