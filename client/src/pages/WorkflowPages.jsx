import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMyRides, cancelRide } from '../api/rideApi'
import { getDriverStatus, submitDriverOnboarding } from '../api/driverApi'

function RideHistoryPage() {
  const [rides, setRides] = useState([])
  const [notice, setNotice] = useState('Loading ride history...')

  const refresh = () => getMyRides().then(({ data }) => { setRides(data.data.rides); setNotice('') }).catch(() => setNotice('Unable to load ride history.'))
  useEffect(() => { queueMicrotask(refresh) }, [])

  const cancel = async (rideId) => {
    try { await cancelRide(rideId, 'Cancelled by passenger'); setNotice('Ride cancelled.'); refresh() } catch (error) { setNotice(error.response?.data?.message || 'Unable to cancel ride.') }
  }

  return <section className="workflow-page"><Link className="back-link" to="/dashboard/passenger"><ArrowLeft size={15} /> Back to booking</Link><p className="eyebrow">PASSENGER HISTORY</p><h1>Your rides.</h1>{notice && <p className="notice">{notice}</p>}{rides.length ? <div className="history-list">{rides.map((ride) => <article className="history-row" key={ride.id}><div><strong>{ride.vehicleType} ride · Rs {ride.fare.toFixed(0)}</strong><span>{ride.distanceKm} km · {ride.paymentMethod} · {new Date(ride.createdAt).toLocaleDateString()}</span></div><div className="history-actions"><span className={`status status-${ride.rideStatus.toLowerCase()}`}>{ride.rideStatus.replaceAll('_', ' ')}</span>{['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(ride.rideStatus) && <button type="button" className="quiet-button" onClick={() => cancel(ride.id)}>Cancel</button>}</div></article>)}</div> : !notice && <p className="empty-state">No rides yet. Your completed trips will appear here.</p>}</section>
}

function DriverOnboardingPage() {
  const [form, setForm] = useState({ licenseNumber: '', vehicleType: 'bike', vehicleNumber: '', vehicleModel: '', vehicleColor: '', documentImages: [] })
  const [status, setStatus] = useState(null)
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { getDriverStatus().then(({ data }) => setStatus(data.data.driver)).catch(() => {}) }, [])

  const submit = async (event) => {
    event.preventDefault(); setIsSubmitting(true); setNotice('')
    try { const { data } = await submitDriverOnboarding(form); setStatus(data.data.driver); setNotice(data.message) } catch (error) { setNotice(error.response?.data?.message || 'Unable to submit onboarding.') } finally { setIsSubmitting(false) }
  }
  const StatusIcon = status?.verificationStatus === 'approved' ? CheckCircle2 : status?.verificationStatus === 'rejected' ? XCircle : Clock3

  return <section className="workflow-page"><Link className="back-link" to="/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link><p className="eyebrow">DRIVER ONBOARDING</p><h1>Bring your vehicle to RideX.</h1>{status && <div className="onboarding-status"><StatusIcon size={20} /><span>Application status<strong>{status.verificationStatus}</strong></span></div>}<form className="onboarding-form" onSubmit={submit}>{[['licenseNumber', 'License number'], ['vehicleNumber', 'Vehicle number'], ['vehicleModel', 'Vehicle model'], ['vehicleColor', 'Vehicle color']].map(([name, label]) => <label key={name}>{label}<input required value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /></label>)}<label>Vehicle type<select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}><option value="bike">Bike</option><option value="auto">Auto</option><option value="cab">Cab</option></select></label>{notice && <p className="notice">{notice}</p>}<button className="primary-link" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit for verification'}</button></form></section>
}

export { RideHistoryPage, DriverOnboardingPage }
