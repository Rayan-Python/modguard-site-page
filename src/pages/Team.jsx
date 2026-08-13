import Seo from '../components/Seo.jsx'

const members = [
  {
    name: 'Ryan Norouzi',
    age: 17,
    school: 'Bergen County Technical High School, Teterboro',
    role: 'Chief Executive Officer',
  },
  {
    name: 'Ryan Soudkhah',
    age: 16,
    school: 'Northern Highlands Regional High School',
    role: 'Chief Technology Officer',
  },
  {
    name: 'Darren Kapturski',
    age: 16,
    school: 'Bergen County Technical High School, Teterboro',
    role: 'Chief Business Development Officer',
  },
  {
    name: 'Edward Chang',
    age: 17,
    school: 'Bergen County Technical High School, Teterboro',
    role: 'Head of Research & Analysis',
  },
  {
    name: 'Geffen Alon',
    age: 17,
    school: 'Bergen County Technical High School, Teterboro',
    role: 'Business Operations',
  },
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
        <p className="doc__lede">The people building ModGuard.</p>

        <ul className="team-grid">
          {members.map((member) => (
            <li className="team-card" key={member.name}>
              <span className="team-card__avatar" aria-hidden="true">
                {initials(member.name)}
              </span>
              <p className="team-card__name">{member.name}</p>
              <p className="team-card__role">{member.role}</p>
              <p className="team-card__meta">
                {member.school} &middot; Age {member.age}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
