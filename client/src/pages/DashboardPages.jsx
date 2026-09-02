import { useCallback, useEffect, useRef, useState } from 'react'
import { Bike, Car, CarFront, CheckCircle2, CircleDollarSign, Clock, Phone, Radio, ShieldCheck, Star, Ticket, Wallet, X } from 'lucide-react'
import Map from '../components/Map'
import LocationSearch from '../components/LocationSearch'
import { useAuth } from '../context/useAuth'
import { cancelRide, createRide, getRideDriver } from '../api/rideApi'
import { getWallet, topUpWallet } from '../api/walletApi'
import { validatePromo } from '../api/promoApi'
import { submitRating } from '../api/ratingApi'
import { acceptDriverRide, getActiveDriverRide, getDriverProfile, getRideRequests, rejectDriverRide, setDriverOnline, updateDriverRideStatus } from '../api/driverApi'
import { getAdminDrivers, getAdminStats, reviewAdminDriver } from '../api/adminApi'
import useRideSocket from '../hooks/useRideSocket'

const VEHICLES = {
  bike: { label: 'Bike', icon: Bike, speedKmh: 28 },
  auto: { label: 'Auto', icon: CarFront, speedKmh: 22 },
  cab: { label: 'Cab', icon: Car, speedKmh: 26 },
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function PassengerDashboard() {
  const [pickupText, setPickupText] = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [routeMetrics, setRouteMetrics] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicleRaw] = useState('bike')
  const setSelectedVehicle = (vehicleType) => { setSelectedVehicleRaw(vehicleType); setAppliedPromo(null); setPromoNotice('') }
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [activeRide, setActiveRide] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [isBooking, setIsBooking] = useState(false)
  const [notice, setNotice] = useState('Click the map to place a pickup or destination.')
  const [walletBalance, setWalletBalance] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoNotice, setPromoNotice] = useState('')
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)

  const refreshWallet = useCallback(() => {
    getWallet().then(({ data }) => setWalletBalance(data.data.balance)).catch(() => {})
  }, [])

  useEffect(() => { refreshWallet() }, [refreshWallet])

  const topUp = async () => {
    const amount = Number(topUpAmount)
    if (!amount || amount <= 0) return
    try {
      const { data } = await topUpWallet(amount)
      setWalletBalance(data.data.balance)
      setTopUpAmount('')
      setNotice(data.message)
    } catch (error) { setNotice(error.response?.data?.message || 'Unable to add money') }
  }

  const selectedQuote = quotes.find((quote) => quote.vehicleType === selectedVehicle)

  const applyPromo = async () => {
    if (!promoInput.trim() || !selectedQuote) return
    setIsApplyingPromo(true)
    setPromoNotice('')
    try {
      const { data } = await validatePromo(promoInput.trim(), selectedQuote.fare)
      setAppliedPromo({ code: promoInput.trim().toUpperCase(), ...data.data })
      setPromoNotice(data.message)
    } catch (error) {
      setAppliedPromo(null)
      setPromoNotice(error.response?.data?.message || 'Unable to validate promo code')
    } finally {
      setIsApplyingPromo(false)
    }
  }

  const clearPromo = () => { setAppliedPromo(null); setPromoInput(''); setPromoNotice('') }

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
        promoCode: appliedPromo?.code,
      })
      setActiveRide(data.data.ride)
      setNotice(data.message)
      clearPromo()
      if (paymentMethod === 'wallet') refreshWallet()
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

  const [etaMinutes, setEtaMinutes] = useState(null)

  useEffect(() => {
    let nextEta = null
    if (driverLocation && activeRide) {
      const headingToPickup = !['RIDE_STARTED'].includes(activeRide.rideStatus)
      const target = headingToPickup ? pickup : destination
      if (target) {
        const km = haversineKm(driverLocation, target)
        const speedKmh = VEHICLES[activeRide.vehicleType]?.speedKmh || 24
        nextEta = Math.max(1, Math.round((km / speedKmh) * 60))
      }
    }
    setEtaMinutes(nextEta)
  }, [driverLocation, activeRide, pickup, destination])

  const { connectionStatus } = useRideSocket({ token: useAuth().token, rideId: activeRide?.id, onStatus: handleRideStatus, onDriverLocation: handleDriverLocation })

  const [driverInfo, setDriverInfo] = useState(null)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    if (!activeRide?.driver) return
    if (driverInfo?._rideId === activeRide.id) return
    getRideDriver(activeRide.id).then(({ data }) => setDriverInfo({ ...data.data.driver, _rideId: activeRide.id })).catch(() => {})
  }, [activeRide?.driver, activeRide?.id, driverInfo])

  const bookingStage = activeRide
    ? (['REQUESTED', 'SEARCHING_DRIVER'].includes(activeRide.rideStatus) ? 'searching'
      : ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(activeRide.rideStatus) ? 'assigned'
        : activeRide.rideStatus === 'RIDE_STARTED' ? 'ontrip'
          : activeRide.rideStatus === 'RIDE_COMPLETED' ? 'completed' : 'locate')
    : (pickup && destination ? 'choose' : 'locate')

  const startNewRide = (message = 'Where to next?') => {
    setActiveRide(null)
    setDriverInfo(null)
    setHasRated(false)
    setDriverLocation(null)
    setEtaMinutes(null)
    setPickup(null)
    setDestination(null)
    setPickupText('')
    setDestinationText('')
    setRouteMetrics(null)
    setQuotes([])
    clearPromo()
    setNotice(message)
  }

  const cancelActiveRide = async () => {
    if (!activeRide) return
    try { await cancelRide(activeRide.id, 'Cancelled by passenger'); startNewRide('Ride cancelled.') } catch (error) { setNotice(error.response?.data?.message || 'Unable to cancel ride.') }
  }

  const rateCompletedRide = async () => {
    const score = Number(window.prompt('Rate your ride from 1 to 5'))
    if (!Number.isInteger(score) || score < 1 || score > 5) return
    const comment = window.prompt('Add a comment (optional)') || ''
    try { await submitRating(activeRide.id, score, comment); setHasRated(true); setNotice('Thanks for rating your ride!') } catch (error) { setNotice(error.response?.data?.message || 'Unable to submit rating.') }
  }

  const changeDestination = () => { setDestination(null); setDestinationText(''); setRouteMetrics(null); setQuotes([]) }

  return (
    <section className="passenger-shell">
      <Map
        className="map-frame-fill"
        pickup={pickup}
        destination={destination}
        driverLocation={driverLocation}
        onMapClick={(location) => {
          if (bookingStage !== 'locate') return
          if (!pickup) { setPickup(location); setNotice('Pickup selected. Now choose your destination.') }
          else { setDestination(location); setNotice('Route preview ready.') }
        }}
        onCurrentLocation={(location, error) => {
          if (location) { setPickup(location); setNotice('Your current location is set as pickup.') }
          else if (error) setNotice(error)
        }}
        onRouteMetrics={setRouteMetrics}
      />

      <div className="shell-topbar">
        <div className="wallet-pill"><Wallet size={14} /> {walletBalance != null ? `Rs ${walletBalance.toFixed(0)}` : '...'}</div>
        {bookingStage !== 'locate' && bookingStage !== 'choose' && (
          <div className={`live-pill live-pill-${connectionStatus}`}><Radio size={12} /> {connectionStatus === 'connected' ? 'Live' : connectionStatus}</div>
        )}
      </div>

      <div className={`sheet sheet-${bookingStage}`}>
        <div className="sheet-handle" />

        {bookingStage === 'locate' && (
          <div className="sheet-inner">
            <p className="eyebrow">SET YOUR TRIP</p>
            <h2 className="sheet-title">Where are you going?</h2>
            <LocationSearch label="Pickup" value={pickupText} onChange={setPickupText} onSelect={(location) => setPoint('pickup', location)} />
            <LocationSearch label="Destination" value={destinationText} onChange={setDestinationText} onSelect={(location) => setPoint('destination', location)} />
            <p className="notice" role="status">{notice}</p>
          </div>
        )}

        {bookingStage === 'choose' && (
          <div className="sheet-inner">
            <div className="sheet-row-between">
              <p className="eyebrow">CHOOSE A RIDE</p>
              <button type="button" className="text-link" onClick={changeDestination}>Change destination</button>
            </div>
            {routeMetrics
              ? <div className="route-summary"><span>ROUTE ESTIMATE</span><strong>{routeMetrics.distanceKm.toFixed(1)} km / {Math.round(routeMetrics.estimatedMinutes)} min</strong></div>
              : <p className="quote-status">Building route...</p>}
            {isQuoteLoading && <p className="quote-status">Calculating vehicle fares...</p>}
            {quotes.length > 0 && (
              <div className="vehicle-grid">
                {['bike', 'auto', 'cab'].map((type) => {
                  const quote = quotes.find((item) => item.vehicleType === type)
                  const Icon = VEHICLES[type].icon
                  return (
                    <button type="button" key={type} className={`vehicle-card ${selectedVehicle === type ? 'vehicle-card-selected' : ''}`} onClick={() => setSelectedVehicle(type)} disabled={!quote}>
                      <Icon size={26} />
                      <span className="vehicle-card-info"><strong>{VEHICLES[type].label}</strong><small>{quote ? `${Math.round(quote.estimatedMinutes)} min ride` : 'Unavailable'}</small></span>
                      <strong className="vehicle-card-price">{quote ? `Rs ${quote.fare.toFixed(0)}` : '—'}</strong>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="promo-row">
              <Ticket size={16} />
              <input type="text" placeholder="Promo code" value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} disabled={Boolean(appliedPromo)} />
              {appliedPromo ? <button type="button" className="quiet-button" onClick={clearPromo}>Remove</button> : <button type="button" onClick={applyPromo} disabled={isApplyingPromo || !promoInput.trim() || !selectedQuote}>{isApplyingPromo ? 'Checking...' : 'Apply'}</button>}
            </div>
            {promoNotice && <p className={`promo-notice ${appliedPromo ? 'promo-notice-ok' : 'promo-notice-error'}`}>{promoNotice}</p>}
            <label className="payment-select">Payment
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="wallet">Wallet{walletBalance != null ? ` (Rs ${walletBalance.toFixed(0)})` : ''}</option>
              </select>
            </label>
            {appliedPromo && selectedQuote && <div className="fare-after-discount"><span>Fare after discount</span><strong>Rs {appliedPromo.finalFare.toFixed(0)}</strong><small>Rs {appliedPromo.discount.toFixed(0)} off with {appliedPromo.code}</small></div>}
            <p className="notice" role="status">{notice}</p>
            <button type="button" className="book-button" onClick={bookRide} disabled={isBooking || !routeMetrics}>{isBooking ? 'Requesting ride...' : `Book ${VEHICLES[selectedVehicle].label}${selectedQuote ? ` · Rs ${(appliedPromo?.finalFare ?? selectedQuote.fare).toFixed(0)}` : ''}`}</button>
            <div className="wallet-strip wallet-strip-compact">
              <span><Wallet size={14} /> Add to wallet</span>
              <span className="wallet-topup"><input type="number" min="1" placeholder="Amount" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} /><button type="button" onClick={topUp}>Add</button></span>
            </div>
          </div>
        )}

        {bookingStage === 'searching' && activeRide && (
          <div className="sheet-inner searching-stage">
            <div className="radar"><span /><span /><span /><CarFront size={22} /></div>
            <h2 className="sheet-title">Finding your {VEHICLES[activeRide.vehicleType]?.label.toLowerCase()}...</h2>
            <p className="notice" role="status">{notice}</p>
            <div className="trip-fare-row"><span>Estimated fare</span><strong>Rs {activeRide.fare.toFixed(0)}</strong></div>
            <button type="button" className="quiet-button cancel-ride-button" onClick={cancelActiveRide}><X size={15} /> Cancel request</button>
          </div>
        )}

        {bookingStage === 'assigned' && activeRide && (
          <div className="sheet-inner">
            <div className="ride-status-row">
              <span className={`status-chip status-chip-${activeRide.rideStatus.toLowerCase()}`}>{activeRide.rideStatus.replaceAll('_', ' ')}</span>
              {etaMinutes != null && <span className="eta-chip"><Clock size={13} /> {etaMinutes} min away</span>}
            </div>
            {driverInfo ? (
              <div className="driver-card">
                <div className="driver-avatar">{driverInfo.name?.[0]?.toUpperCase() || 'D'}</div>
                <div className="driver-meta">
                  <strong>{driverInfo.name}</strong>
                  <span className="driver-rating"><Star size={13} /> {driverInfo.rating > 0 ? driverInfo.rating.toFixed(1) : 'New'}</span>
                  <span>{driverInfo.vehicleColor} {driverInfo.vehicleModel} · {driverInfo.vehicleNumber}</span>
                </div>
                <a className="call-button" href={`tel:${driverInfo.phone}`}><Phone size={17} /></a>
              </div>
            ) : <p className="notice">Loading driver details...</p>}
            <div className="trip-fare-row"><span>Trip fare</span><strong>Rs {activeRide.fare.toFixed(0)}{activeRide.discountAmount > 0 ? ` (Rs ${activeRide.discountAmount.toFixed(0)} off)` : ''}</strong></div>
            <button type="button" className="quiet-button cancel-ride-button" onClick={cancelActiveRide}><X size={15} /> Cancel ride</button>
          </div>
        )}

        {bookingStage === 'ontrip' && activeRide && (
          <div className="sheet-inner">
            <div className="ride-status-row">
              <span className="status-chip status-chip-on-trip">On the trip</span>
              {etaMinutes != null && <span className="eta-chip"><Clock size={13} /> {etaMinutes} min to drop</span>}
            </div>
            {driverInfo && (
              <div className="driver-card driver-card-compact">
                <div className="driver-avatar">{driverInfo.name?.[0]?.toUpperCase() || 'D'}</div>
                <div className="driver-meta"><strong>{driverInfo.name}</strong><span>{driverInfo.vehicleColor} {driverInfo.vehicleModel} · {driverInfo.vehicleNumber}</span></div>
                <a className="call-button" href={`tel:${driverInfo.phone}`}><Phone size={17} /></a>
              </div>
            )}
            <div className="trip-fare-row"><span>Trip fare</span><strong>Rs {activeRide.fare.toFixed(0)}</strong></div>
            <p className="notice">Sit tight, you're on your way.</p>
          </div>
        )}

        {bookingStage === 'completed' && activeRide && (
          <div className="sheet-inner completed-stage">
            <CheckCircle2 size={34} className="completed-icon" />
            <h2 className="sheet-title">Trip completed</h2>
            <div className="trip-fare-row"><span>Total fare</span><strong>Rs {activeRide.fare.toFixed(0)}</strong></div>
            <p className="notice">{notice}</p>
            {!hasRated
              ? <button type="button" className="book-button" onClick={rateCompletedRide}><Star size={15} /> Rate your ride</button>
              : <p className="promo-notice promo-notice-ok">Thanks for rating your ride!</p>}
            <button type="button" className="quiet-button" onClick={() => startNewRide()}>Book another ride</button>
          </div>
        )}
      </div>
    </section>
  )
}

function DriverDashboard() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [activeRide, setActiveRide] = useState(null)
  const [notice, setNotice] = useState('Loading your driver workspace...')
  const [isSharingLocation, setIsSharingLocation] = useState(false)
  const watchIdRef = useRef(null)

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

  const { sendDriverLocation } = useRideSocket({ token, rideId: activeRide?.id })

  useEffect(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setIsSharingLocation(false)
    }

    if (!activeRide || activeRide.rideStatus === 'RIDE_COMPLETED' || !navigator.geolocation) {
      return undefined
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setIsSharingLocation(true)
        sendDriverLocation({ type: 'Point', coordinates: [coords.longitude, coords.latitude] })
      },
      () => setNotice('Turn on location access so the rider can see you arriving.'),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 },
    )

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [activeRide, sendDriverLocation])

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

  return <section className="role-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">DRIVER DESK</p><h1>Ready for the next ride, {user.name.split(' ')[0]}.</h1></div><button type="button" className={`availability ${profile?.isOnline ? 'availability-on' : ''}`} onClick={toggleOnline} disabled={!profile}>{profile?.isOnline ? 'Online' : 'Offline'}</button></div><p className="notice">{notice}</p>{activeRide ? <div className="active-driver-ride"><p className="eyebrow">CURRENT RIDE</p><h2>{activeRide.rideStatus.replaceAll('_', ' ')}</h2><span>{activeRide.distanceKm} km · Rs {activeRide.fare.toFixed(0)} · {activeRide.paymentMethod}</span>{isSharingLocation && <span className="live-share-badge"><Radio size={13} /> Sharing live location with rider</span>}<button type="button" className="book-button" onClick={advance}>{activeRide.rideStatus === 'RIDE_STARTED' ? 'Complete ride' : 'Advance ride status'}</button></div> : <><div className="role-grid"><div><CarFront size={21} /><strong>{profile?.vehicleModel || 'Vehicle profile'}</strong><span>{profile?.vehicleType || 'Vehicle'} · {profile?.verificationStatus || 'Loading'}</span></div><div><CircleDollarSign size={21} /><strong>Rs {profile?.totalEarnings?.toFixed(0) || '0'}</strong><span>{profile?.totalRides || 0} completed rides</span></div></div><div className="request-list"><p className="eyebrow">RIDE REQUESTS</p>{requests.length ? requests.map((ride) => <div className="request-row" key={ride.id}><div><strong>{ride.vehicleType} · {ride.distanceKm} km</strong><span>Rs {ride.fare.toFixed(0)} · {ride.paymentMethod}</span></div><div><button type="button" onClick={() => accept(ride.id)}>Accept</button><button type="button" className="quiet-button" onClick={() => reject(ride.id)}>Reject</button></div></div>) : <p className="empty-state">No matching ride requests right now.</p>}</div></>}</section>
}

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [notice, setNotice] = useState('Loading operations data...')

  const refresh = async () => {
    try {
      const [statsResponse, driversResponse] = await Promise.all([getAdminStats(), getAdminDrivers()])
      setStats(statsResponse.data.data.stats)
      setDrivers(driversResponse.data.data.drivers)
      setNotice('Operations data is up to date.')
    } catch (error) { setNotice(error.response?.data?.message || 'Unable to load operations data') }
  }

  useEffect(() => { queueMicrotask(refresh) }, [])

  const review = async (driverId, status) => {
    const rejectionReason = status === 'rejected' ? window.prompt('Reason for rejection') : undefined
    if (status === 'rejected' && !rejectionReason?.trim()) return
    try { await reviewAdminDriver(driverId, status, rejectionReason); setNotice(`Driver ${status}.`); refresh() } catch (error) { setNotice(error.response?.data?.message || 'Unable to review driver') }
  }

  const statCards = [['Users', stats?.totalUsers], ['Drivers', stats?.totalDrivers], ['Pending', stats?.pendingDrivers], ['Active rides', stats?.activeRides], ['Completed', stats?.completedRides], ['Revenue', `Rs ${(stats?.totalRevenue || 0).toFixed(0)}`]]
  return <section className="role-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">OPERATIONS DESK</p><h1>Keep every ride moving.</h1></div><ShieldCheck size={24} color="#F5A623" /></div><p className="notice">{notice}</p><div className="admin-stats">{statCards.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '...'}</strong></div>)}</div><div className="admin-review"><div><p className="eyebrow">DRIVER VERIFICATION</p><h2>Pending applications</h2></div>{drivers.length ? drivers.map((driver) => <div className="request-row" key={driver.id}><div><strong>{driver.vehicleModel} · {driver.vehicleType}</strong><span>{driver.vehicleNumber} · {driver.licenseNumber}</span></div><div><button type="button" onClick={() => review(driver.id, 'approved')}>Approve</button><button type="button" className="quiet-button" onClick={() => review(driver.id, 'rejected')}>Reject</button></div></div>) : <p className="empty-state">No pending driver applications.</p>}</div></section>
}

export { PassengerDashboard, DriverDashboard, AdminDashboard }