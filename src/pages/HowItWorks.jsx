const steps = [
  {
    n: '01',
    title: 'Download a file',
    body: 'Grab any mod or game file from a forum, marketplace, or friend.',
  },
  {
    n: '02',
    title: 'ModGuard scans it',
    body: 'Point ModGuard at the file. It checks for malware and suspicious behavior.',
  },
  {
    n: '03',
    title: 'Safe or blocked',
    body: 'Get a clear result before anything runs. Install with confidence, or walk away.',
  },
]

export default function HowItWorks() {
  return (
    <section className="doc">
      <div className="container doc__inner">
        <h1 className="doc__title">How it works</h1>
        <p className="doc__lede">
          Not every mod or game file is what it claims to be. ModGuard checks
          before you install, and gives you a plain answer.
        </p>

        <ol className="doc__steps">
          {steps.map((step) => (
            <li className="doc__step" key={step.n}>
              <span className="doc__step-num">{step.n}</span>
              <h3 className="doc__step-title">{step.title}</h3>
              <p className="doc__step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
