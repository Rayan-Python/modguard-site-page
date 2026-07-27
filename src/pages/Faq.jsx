const faqs = [
  {
    q: 'Is ModGuard free?',
    a: 'Yes, ModGuard is free to use.',
  },
  {
    q: 'What does ModGuard send when it scans a file?',
    a: 'Just a fingerprint of the file, not its contents. See Privacy for details.',
  },
  {
    q: 'ModGuard flagged something that isn’t malware. What now?',
    a: 'Use Report an issue in the nav and send us the file. We’ll take a look.',
  },
  {
    q: 'Which games does ModGuard work with?',
    a: 'Any mod or game file, not just one game.',
  },
]

export default function Faq() {
  return (
    <section className="doc">
      <div className="container doc__inner">
        <h1 className="doc__title">FAQ</h1>

        {faqs.map((item) => (
          <div key={item.q}>
            <h2 className="doc__heading">{item.q}</h2>
            <p className="doc__body">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
