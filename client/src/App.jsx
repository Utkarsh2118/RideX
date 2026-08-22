import { useEffect, useState } from 'react'
import Map from './components/Map'
import LocationSearch from './components/LocationSearch'
import './App.css'

function App() {
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

  const handleMapClick = (location) => {
    if (!pickup) {
      setPickup(location)
      setNotice('Pickup selected. Now choose your destination.')
      return
    }

    setDestination(location)
    setNotice('Route preview ready.')
  }

  const formatLocation = (location) =>
    location ? `${location[0].toFixed(5)}, ${location[1].toFixed(5)}` : 'Not selected'

  useEffect(() => {
    if (!routeMetrics) {
      return undefined
    }

    const controller = new AbortController()

    queueMicrotask(() => {
      if (controller.signal.aborted) return

      setIsQuoteLoading(true)
      Promise.all(['bike', 'auto', 'cab'].map((vehicleType) =>
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/fares/quote`, {
          body: JSON.stringify({ ...routeMetrics, vehicleType }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        }).then((response) => response.json()),
      ))
        .then((responses) => setQuotes(responses.filter((response) => response.success).map((response) => response.data.quote)))
        .catch((error) => {
          if (error.name !== 'AbortError') setQuotes([])
        })
        .finally(() => setIsQuoteLoading(false))
    })

    return () => controller.abort()
  }, [routeMetrics])

  return (
    <main className="ride-app">
      <header className="topbar">
        <div className="brand-mark"><span>R</span> RIDEX</div>
        <span className="service-label">CITY MOBILITY / LOCATION LAB</span>
      </header>

      <section className="location-workspace">
        <div className="location-panel">
          <p className="eyebrow">PLAN YOUR ROUTE</p>
          <h1>Your ride starts here.</h1>
          <p className="intro">Choose two points on the map and RideX will build a live route preview.</p>

          <div className="location-fields">
            <LocationSearch label="Pickup" value={pickupText} onChange={setPickupText} onSelect={(location) => setPoint('pickup', location)} />
            <LocationSearch label="Destination" value={destinationText} onChange={setDestinationText} onSelect={(location) => setPoint('destination', location)} />
          </div>

          <p className="notice" role="status">{notice}</p>

          <div className="coordinates">
            <div><span className="coordinate-dot pickup-dot" />Pickup<strong>{formatLocation(pickup)}</strong></div>
            <div><span className="coordinate-dot destination-dot" />Destination<strong>{formatLocation(destination)}</strong></div>
          </div>
          {routeMetrics && <div className="route-summary">
            <span>ROUTE ESTIMATE</span>
            <strong>{routeMetrics.distanceKm.toFixed(1)} km / {Math.round(routeMetrics.estimatedMinutes)} min</strong>
          </div>}
          {isQuoteLoading && <p className="quote-status">Calculating vehicle fares...</p>}
          {quotes.length > 0 && <div className="quote-list">
            {quotes.map((quote) => <div className="quote" key={quote.vehicleType}><span>{quote.vehicleType}</span><strong>Rs {quote.fare.toFixed(0)}</strong></div>)}
          </div>}
        </div>

        <Map
          pickup={pickup}
          destination={destination}
          onMapClick={handleMapClick}
          onCurrentLocation={(location, error) => {
            if (location) {
              setPickup(location)
              setNotice('Your current location is set as pickup.')
            } else if (error) setNotice(error)
          }}
          onRouteMetrics={setRouteMetrics}
        />
      </section>
    </main>
  )
}

export default App
