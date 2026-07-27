import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import DotGrid from './components/DotGrid.jsx'
import Home from './pages/Home.jsx'
import Privacy from './pages/Privacy.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Version from './pages/Version.jsx'
import Terms from './pages/Terms.jsx'
import Faq from './pages/Faq.jsx'
import Security from './pages/Security.jsx'

export default function App() {
  return (
    <div className="site">
      <DotGrid />
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/version" element={<Version />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/security" element={<Security />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
