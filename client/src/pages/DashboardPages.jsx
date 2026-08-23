import { useCallback, useEffect, useState } from 'react'
import { CarFront, CircleDollarSign, MapPinned, ShieldCheck } from 'lucide-react'
import Map from '../components/Map'
import LocationSearch from '../components/LocationSearch'
import { useAuth } from '../context/useAuth'
import { createRide } from '../api/rideApi'
import { acceptDriverRide, getActiveDriverRide, getDriverProfile, getRideRequests, rejectDriverRide, setDriverOnline, updateDriverRideStatus } from '../api/driverApi'
import useRideSocket from '../hooks/useRideSocket'

function PassengerDashboard() {
  const [pickupText, setPickupText] = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [routeMetrics, setRouteMetrics] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState('bike')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [activeRide, setActiveRide] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [isBooking, setIsBooking] = useState(false)
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

  const bookRide = async () => {
    if (!pickup || !destination || !routeMetrics) {
      setNotice('Select pickup and destination and wait for the route estimate.')
      return
    }

    setIsBooking(true)
    try {
      const { data } = await createRide({
        pickupLocation: { type: 'Point', coordinates: [pickup[1], pickup[0]] },
        destinationLocation: { type: 'Point', coordinates: [destination[1], destination[0]] },
        distanceKm: routeMetrics.distanceKm,
        estimatedDurationMinutes: routeMetrics.estimatedMinutes,
        vehicleType: selectedVehicle,
        paymentMethod,
      })
      setActiveRide(data.data.ride)
      setNotice(data.message)
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to create ride')
    } finally {
      setIsBooking(false)
    }
  }

  const handleRideStatus = useCallback((event) => {
    setActiveRide((ride) => ride ? { ...ride, rideStatus: event.rideStatus } : ride)
    setNotice(`Ride status: ${event.rideStatus.replaceAll('_', ' ')}`)
  }, [])

  const handleDriverLocation = useCallback((event) => {
    const [latitude, longitude] = event.location.coordinates
    setDriverLocation([latitude, longitude])
  }, [])

  const { connectionStatus } = useRideSocket({ token: useAuth().token, rideId: activeRide?.id, onStatus: handleRideStatus, onDriverLocation: handleDriverLocation })

  return <section className="dashboard-page"><div className="dashboard-heading"><div><p className="eyebrow">PASSENGER DESK</p><h1>Where are you going?</h1><p className="intro">Plan the route, compare vehicles, and keep the city moving on your terms.</p></div><div className="dashboard-badge"><MapPinned size={17} /> {activeRide ? `Live updates ${connectionStatus}` : 'Live route planner'}</div></div><div className="booking-grid"><div className="booking-panel"><LocationSearch label="Pickup" value={pickupText} onChange={setPickupText} onSelect={(location) => setPoint('pickup', location)} /><LocationSearch label="Destination" value={destinationText} onChange={setDestinationText} onSelect={(location) => setPoint('destination', location)} /><p className="notice" role="status">{notice}</p><div className="coordinates"><div><span className="coordinate-dot pickup-dot" />Pickup<strong>{pickup ? `${pickup[0].toFixed(5)}, ${pickup[1].toFixed(5)}` : 'Not selected'}</strong></div><div><span className="coordinate-dot destination-dot" />Destination<strong>{destination ? `${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}` : 'Not selected'}</strong></div></div>{routeMetrics && <div className="route-summary"><span>ROUTE ESTIMATE</span><strong>{routeMetrics.distanceKm.toFixed(1)} km / {Math.round(routeMetrics.estimatedMinutes)} min</strong></div>}{isQuoteLoading && <p className="quote-status">Calculating vehicle fares...</p>}{quotes.length > 0 && <div className="quote-list">{quotes.map((quote) => <button type="button" className={`quote ${selectedVehicle === quote.vehicleType ? 'quote-selected' : ''}`} key={quote.vehicleType} onClick={() => setSelectedVehicle(quote.vehicleType)}><span>{quote.vehicleType}</span><strong>Rs {quote.fare.toFixed(0)}</strong></button>)}</div>}<label className="payment-select">Payment<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Cash</option><option value="online">Online</option></select></label><button type="button" className="book-button" onClick={bookRide} disabled={isBooking || !routeMetrics}>{isBooking ? 'Requesting ride...' : 'Request this ride'}</button>{activeRide && <div className="active-ride"><span>RIDE REQUESTED</span><strong>{activeRide.rideStatus.replaceAll('_', ' ')}</strong><small>Fare locked at Rs {activeRide.fare.toFixed(0)}. Driver updates are live.</small></div>}</div><Map pickup={pickup} destination={destination} driverLocation={driverLocation} onMapClick={(location) => { if (!pickup) { setPickup(location); setNotice('Pickup selected. Now choose your destination.') } else { setDestination(location); setNotice('Route preview ready.') } }} onCurrentLocation={(location, error) => { if (location) { setPickup(location); setNotice('Your current location is set as pickup.') } else if (error) setNotice(error) }} onRouteMetrics={setRouteMetrics} /></div></section>
}

function DriverDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [activeRide, setActiveRide] = useState(null)
  const [notice, setNotice] = useState('Loading your driver workspace...')

  const refresh = async () => {
    try {
      const [profileResponse, requestsResponse, activeResponse] = await Promise.all([getDriverProfile(), getRideRequests(), getActiveDriverRide()])
      setProfile(profileResponse.data.data.driver)
      setRequests(requestsResponse.data.data.rides)
      setActiveRide(activeResponse.data.data.ride)
      setNotice('Driver workspace is up to date.')
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to load driver workspace')
    }
  }

  useEffect(() => {
    queueMicrotask(refresh)
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [])

  const toggleOnline = async () => {
    try {
      const { data } = await setDriverOnline(!profile.isOnline)
      setProfile(data.data.driver)
      setNotice(data.message)
    } catch (error) { setNotice(error.response?.data?.message || 'Unable to update availability') }
  }

  const accept = async (rideId) => {
    try { const { data } = await acceptDriverRide(rideId); setActiveRide(data.data.ride); setRequests((items) => items.filter((ride) => ride.id !== rideId)); setNotice(data.message) } catch (error) { setNotice(error.response?.data?.message || 'Ride is no longer available'); refresh() }
  }

  const reject = async (rideId) => {
    try { await rejectDriverRide(rideId); setRequests((items) => items.filter((ride) => ride.id !== rideId)); setNotice('Ride request rejected.') } catch (error) { setNotice(error.response?.data?.message || 'Unable to reject ride') }
  }

  const advance = async () => {
    const nextStatus = { DRIVER_ASSIGNED: 'DRIVER_ARRIVING', DRIVER_ARRIVING: 'DRIVER_ARRIVED', DRIVER_ARRIVED: 'RIDE_STARTED', RIDE_STARTED: 'RIDE_COMPLETED' }[activeRide.rideStatus]
    try { const { data } = await updateDriverRideStatus(activeRide.id, nextStatus); setActiveRide(nextStatus === 'RIDE_COMPLETED' ? null : data.data.ride); setNotice(data.message); if (nextStatus === 'RIDE_COMPLETED') refresh() } catch (error) { setNotice(error.response?.data?.message || 'Unable to update ride status') }
  }

  return <section className="role-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">DRIVER DESK</p><h1>Ready for the next ride, {user.name.split(' ')[0]}.</h1></div><button type="button" className={`availability ${profile?.isOnline ? 'availability-on' : ''}`} onClick={toggleOnline} disabled={!profile}>{profile?.isOnline ? 'Online' : 'Offline'}</button></div><p className="notice">{notice}</p>{activeRide ? <div className="active-driver-ride"><p className="eyebrow">CURRENT RIDE</p><h2>{activeRide.rideStatus.replaceAll('_', ' ')}</h2><span>{activeRide.distanceKm} km · Rs {activeRide.fare.toFixed(0)} · {activeRide.paymentMethod}</span><button type="button" className="book-button" onClick={advance}>{activeRide.rideStatus === 'RIDE_STARTED' ? 'Complete ride' : 'Advance ride status'}</button></div> : <><div className="role-grid"><div><CarFront size={21} /><strong>{profile?.vehicleModel || 'Vehicle profile'}</strong><span>{profile?.vehicleType || 'Vehicle'} · {profile?.verificationStatus || 'Loading'}</span></div><div><CircleDollarSign size={21} /><strong>Rs {profile?.totalEarnings?.toFixed(0) || '0'}</strong><span>{profile?.totalRides || 0} completed rides</span></div></div><div className="request-list"><p className="eyebrow">RIDE REQUESTS</p>{requests.length ? requests.map((ride) => <div className="request-row" key={ride.id}><div><strong>{ride.vehicleType} · {ride.distanceKm} km</strong><span>Rs {ride.fare.toFixed(0)} · {ride.paymentMethod}</span></div><div><button type="button" onClick={() => accept(ride.id)}>Accept</button><button type="button" className="quiet-button" onClick={() => reject(ride.id)}>Reject</button></div></div>) : <p className="empty-state">No matching ride requests right now.</p>}</div></>}</section>
}

function AdminDashboard() {
  return <section className="role-dashboard"><p className="eyebrow">OPERATIONS DESK</p><h1>Keep every ride moving.</h1><div className="role-grid"><div><ShieldCheck size={21} /><strong>Driver verification</strong><span>Review onboarding applications and approvals.</span></div><div><MapPinned size={21} /><strong>Ride operations</strong><span>Monitor the platform as it grows.</span></div></div><p className="notice">Admin tools are protected by the admin role and will expand with platform analytics.</p></section>
}

export { PassengerDashboard, DriverDashboard, AdminDashboard }
