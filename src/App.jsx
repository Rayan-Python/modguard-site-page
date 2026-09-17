import { Analytics } from '@vercel/analytics/react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import TermsGate from './components/TermsGate.jsx'
import Home from './pages/Home.jsx'
import Privacy from './pages/Privacy.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Detection from './pages/Detection.jsx'
import Terms from './pages/Terms.jsx'
import Security from './pages/Security.jsx'
import WhyFree from './pages/WhyFree.jsx'
import Team from './pages/Team.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'
import SecurityTools from './pages/SecurityTools.jsx'
// Version and InternalStats pages are unwired now that ModGuard is web-only —
// both tracked the desktop app's GitHub releases. Components are untouched.

export default function App() {
  return (
    <div className="site">
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/security-tools" element={<SecurityTools />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/security" element={<Security />} />
          <Route path="/free" element={<WhyFree />} />
          <Route path="/team" element={<Team />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <TermsGate />
      <Analytics />
    </div>
  )
}
