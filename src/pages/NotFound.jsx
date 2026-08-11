import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'

export default function NotFound() {
  return (
    <section className="doc doc--panel">
      <Seo
        title="Page Not Found: ModGuard"
        description="This page doesn't exist. Head back to the ModGuard homepage."
      />
      <div className="container doc__inner not-found">
        <h1 className="doc__title">This page doesn't exist.</h1>
        <p className="doc__lede">
          The link might be broken, or the page may have moved.
        </p>
        <Link to="/" className="btn btn--primary">
          Back to homepage
        </Link>
      </div>
    </section>
  )
}
