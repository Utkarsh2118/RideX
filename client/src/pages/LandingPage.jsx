import { ArrowRight, Compass, ShieldCheck, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav"><Link className="nav-brand" to="/"><span>R</span> RIDEX</Link><Link className="text-link" to="/login">Sign in <ArrowRight size={15} /></Link></nav>
      <section className="landing-hero">
        <div><p className="eyebrow">CITY MOBILITY, REFINED</p><h1>Move through the city with intention.</h1><p className="landing-copy">A considered ride-booking experience for everyday journeys, built around clarity, safety, and the route ahead.</p><Link className="primary-link" to="/register">Start your journey <ArrowRight size={17} /></Link></div>
        <div className="route-art" aria-label="Abstract city route illustration"><div className="route-line" /><div className="route-pin pin-one" /><div className="route-pin pin-two" /><span className="route-label label-one">ORIGIN</span><span className="route-label label-two">ARRIVAL</span></div>
      </section>
      <section className="landing-values"><div><Compass size={20} /><strong>Routes that feel simple</strong><span>Clear choices from pickup to arrival.</span></div><div><ShieldCheck size={20} /><strong>Safety built in</strong><span>Verified drivers and protected accounts.</span></div><div><Zap size={20} /><strong>Ready when you are</strong><span>Fast matching for your next ride.</span></div></section>
    </main>
  )
}

export default LandingPage
