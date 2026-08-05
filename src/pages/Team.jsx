import Seo from '../components/Seo.jsx'

const members = [
  'Ryan Soudkhah',
  'Ryan Norouzi',
  'Geffen Alon',
  'Edward Chang',
  'Darren Kapturski',
]

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Team() {
  return (
    <section className="doc doc--panel doc--wide">
      <Seo
        title="The ModGuard Team"
        description="Meet the people building ModGuard, a free malware scanner for game mods and files."
      />
      <div className="container doc__inner">
        <h1 className="doc__title">Team</h1>
        <p className="doc__lede">
          The people building ModGuard. Full bios coming soon.
        </p>

        <ul className="team-grid">
          {members.map((name) => (
            <li className="team-card" key={name}>
              <span className="team-card__avatar" aria-hidden="true">
                {initials(name)}
              </span>
              <p className="team-card__name">{name}</p>
              <span className="team-card__badge">Coming soon</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
