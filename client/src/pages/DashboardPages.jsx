import { useEffect, useState } from 'react'
import { CarFront, CircleDollarSign, MapPinned, ShieldCheck } from 'lucide-react'
import Map from '../components/Map'
import LocationSearch from '../components/LocationSearch'
import { useAuth } from '../context/useAuth'

function PassengerDashboard() {
  const [pickupText, setPickupText] = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [routeMetrics, setRouteMetrics] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [notice, setNotice] = useState('Click the map to place a pickup or destination.')

  const setPoint = (type, location) => {
    if (type === 'pickup') setPickup(location)
    if (type === 'destination') setDestination(location)
    setNotice(`${type[0].toUpperCase()}${type.slice(1)} location selected.`)
  }

  useEffect(() => {
    if (!routeMetrics) return undefined
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setIsQuoteLoading(true)
      Promise.all(['bike', 'auto', 'cab'].map((vehicleType) => fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/fares/quote`, { body: JSON.stringify({ ...routeMetrics, vehicleType }), headers: { 'Content-Type': 'application/json' }, method: 'POST', signal: controller.signal }).then((response) => response.json())))
        .then((responses) => setQuotes(responses.filter((response) => response.success).map((response) => response.data.quote)))
        .catch((error) => { if (error.name !== 'AbortError') setQuotes([]) })
        .finally(() => setIsQuoteLoading(false))
    })
    return () => controller.abort()
  }, [routeMetrics])

  return <section className="dashboard-page"><div className="dashboard-heading"><div><p className="eyebrow">PASSENGER DESK</p><h1>Where are you going?</h1><p className="intro">Plan the route, compare vehicles, and keep the city moving on your terms.</p></div><div className="dashboard-badge"><MapPinned size={17} /> Live route planner</div></div><div className="booking-grid"><div className="booking-panel"><LocationSearch label="Pickup" value={pickupText} onChange={setPickupText} onSelect={(location) => setPoint('pickup', location)} /><LocationSearch label="Destination" value={destinationText} onChange={setDestinationText} onSelect={(location) => setPoint('destination', location)} /><p className="notice" role="status">{notice}</p><div className="coordinates"><div><span className="coordinate-dot pickup-dot" />Pickup<strong>{pickup ? `${pickup[0].toFixed(5)}, ${pickup[1].toFixed(5)}` : 'Not selected'}</strong></div><div><span className="coordinate-dot destination-dot" />Destination<strong>{destination ? `${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}` : 'Not selected'}</strong></div></div>{routeMetrics && <div className="route-summary"><span>ROUTE ESTIMATE</span><strong>{routeMetrics.distanceKm.toFixed(1)} km / {Math.round(routeMetrics.estimatedMinutes)} min</strong></div>}{isQuoteLoading && <p className="quote-status">Calculating vehicle fares...</p>}{quotes.length > 0 && <div className="quote-list">{quotes.map((quote) => <div className="quote" key={quote.vehicleType}><span>{quote.vehicleType}</span><strong>Rs {quote.fare.toFixed(0)}</strong></div>)}</div>}</div><Map pickup={pickup} destination={destination} onMapClick={(location) => { if (!pickup) { setPickup(location); setNotice('Pickup selected. Now choose your destination.') } else { setDestination(location); setNotice('Route preview ready.') } }} onCurrentLocation={(location, error) => { if (location) { setPickup(location); setNotice('Your current location is set as pickup.') } else if (error) setNotice(error) }} onRouteMetrics={setRouteMetrics} /></div></section>
}

function DriverDashboard() {
  const { user } = useAuth()
  return <section className="role-dashboard"><p className="eyebrow">DRIVER DESK</p><h1>Ready for the next ride, {user.name.split(' ')[0]}.</h1><div className="role-grid"><div><CarFront size={21} /><strong>Driver onboarding</strong><span>Manage verification and vehicle details.</span></div><div><CircleDollarSign size={21} /><strong>Earnings</strong><span>Your ride income will appear here.</span></div></div><p className="notice">Your driver workspace is ready for ride requests and live status updates.</p></section>
}

function AdminDashboard() {
  return <section className="role-dashboard"><p className="eyebrow">OPERATIONS DESK</p><h1>Keep every ride moving.</h1><div className="role-grid"><div><ShieldCheck size={21} /><strong>Driver verification</strong><span>Review onboarding applications and approvals.</span></div><div><MapPinned size={21} /><strong>Ride operations</strong><span>Monitor the platform as it grows.</span></div></div><p className="notice">Admin tools are protected by the admin role and will expand with platform analytics.</p></section>
}

export { PassengerDashboard, DriverDashboard, AdminDashboard }
