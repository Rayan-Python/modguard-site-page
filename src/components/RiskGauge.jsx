/**
 * The one risk dial every tool reports through: the mod scanner, the URL
 * checker and the native-file scanner all call this with their own score and
 * verdict rather than each drawing their own.
 *
 * Scores run 0–99, not 0–100. The scoring engines cap there on purpose — a
 * static read of a file is never certainty — and showing 99 as the top of the
 * dial keeps that honest instead of implying a perfect 100 exists.
 *
 * Colour follows the site: greys for the dial itself, and the two status
 * colours the tools already use for the bands. Nothing new is introduced.
 */

const MAX_SCORE = 99

// Where one band ends and the next begins. These match the verdict thresholds
// the scoring engines use, so the needle and the word underneath never disagree.
const BANDS = [
  { from: 0, to: 30, tone: 'safe', label: 'Safe' },
  { from: 30, to: 60, tone: 'sus', label: 'Suspicious' },
  { from: 60, to: MAX_SCORE, tone: 'bad', label: 'Malicious' },
]

const START_ANGLE = -120
const SWEEP = 240

const angleFor = (score) => START_ANGLE + (clamp(score) / MAX_SCORE) * SWEEP

function clamp(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0
  return Math.min(MAX_SCORE, Math.max(0, score))
}

/** 0° is straight up, angles increase clockwise. */
function polar(cx, cy, radius, degrees) {
  const radians = ((degrees - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function arcPath(cx, cy, radius, startDegrees, endDegrees) {
  const start = polar(cx, cy, radius, startDegrees)
  const end = polar(cx, cy, radius, endDegrees)
  const largeArc = Math.abs(endDegrees - startDegrees) > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const toneFor = (score) => BANDS.find((band) => score < band.to)?.tone ?? 'bad'

/**
 * `verdict` and `description` come from the tool, because only the tool knows
 * why it scored what it did. The dial will not invent a reason.
 */
export default function RiskGauge({ score, verdict, description, unit = 'risk score' }) {
  const value = clamp(score)
  const tone = toneFor(value)
  const size = 200
  const centre = size / 2
  const radius = 78
  const strokeWidth = 12

  const needle = polar(centre, centre, radius - 20, angleFor(value))

  return (
    <div className="gauge">
      <div className="gauge__dial">
        <svg
          viewBox={`0 0 ${size} ${size * 0.78}`}
          className="gauge__svg"
          role="img"
          aria-label={`${unit} ${value} out of ${MAX_SCORE}: ${verdict ?? 'no verdict'}`}
        >
          {/* the unfilled dial */}
          <path
            d={arcPath(centre, centre, radius, START_ANGLE, START_ANGLE + SWEEP)}
            className="gauge__track"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* the three bands, dim until the needle is in one */}
          {BANDS.map((band) => (
            <path
              key={band.tone}
              d={arcPath(centre, centre, radius, angleFor(band.from), angleFor(band.to))}
              className={`gauge__band gauge__band--${band.tone}`}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ))}

          {/* how far along the dial this score sits */}
          {value > 0 && (
            <path
              d={arcPath(centre, centre, radius, START_ANGLE, angleFor(value))}
              className={`gauge__fill gauge__fill--${tone}`}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          )}

          <line
            x1={centre}
            y1={centre}
            x2={needle.x.toFixed(2)}
            y2={needle.y.toFixed(2)}
            className={`gauge__needle gauge__needle--${tone}`}
          />
          <circle cx={centre} cy={centre} r="6" className={`gauge__hub gauge__hub--${tone}`} />

          <text x={centre} y={centre + 34} className="gauge__value" textAnchor="middle">
            {value}
            <tspan className="gauge__max"> / {MAX_SCORE}</tspan>
          </text>
        </svg>
      </div>

      <div className="gauge__readout">
        {verdict && <span className={`gauge__verdict gauge__verdict--${tone}`}>{verdict}</span>}
        {description && <p className="gauge__why">{description}</p>}
      </div>
    </div>
  )
}
