import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMyRides, cancelRide } from '../api/rideApi'
import { getDriverStatus, submitDriverOnboarding } from '../api/driverApi'
import { createOnlinePayment, getPaymentHistory } from '../api/paymentApi'
import { getRideRatings, submitRating } from '../api/ratingApi'

function RideHistoryPage() {
  const [rides, setRides] = useState([])
  const [payments, setPayments] = useState([])
  const [ratedRides, setRatedRides] = useState([])
  const [notice, setNotice] = useState('Loading ride history...')

  const refresh = async () => {
    try {
      const [{ data: rideData }, { data: paymentData }] = await Promise.all([getMyRides(), getPaymentHistory()])
      setRides(rideData.data.rides)
      setPayments(paymentData.data.payments)
      setNotice('')
      const completed = rideData.data.rides.filter((ride) => ride.rideStatus === 'RIDE_COMPLETED')
      const ratingResults = await Promise.all(completed.map((ride) => getRideRatings(ride.id).catch(() => ({ data: { data: { ratings: [] } } }))))
      setRatedRides(completed.filter((ride, index) => ratingResults[index].data.data.ratings.some((rating) => rating.reviewer === ride.passenger)).map((ride) => ride.id))
    } catch { setNotice('Unable to load ride history.') }
  }
  useEffect(() => { queueMicrotask(refresh) }, [])

  const cancel = async (rideId) => {
    try { await cancelRide(rideId, 'Cancelled by passenger'); setNotice('Ride cancelled.'); refresh() } catch (error) { setNotice(error.response?.data?.message || 'Unable to cancel ride.') }
  }

  const payOnline = async (rideId) => {
    try { await createOnlinePayment(rideId); setNotice('Online payment created.'); refresh() } catch (error) { setNotice(error.response?.data?.message || 'Online payment is unavailable.') }
  }

  const rateRide = async (rideId) => {
    const score = Number(window.prompt('Rating from 1 to 5'))
    if (!Number.isInteger(score) || score < 1 || score > 5) return
    const comment = window.prompt('Comment (optional)') || ''
    try { await submitRating(rideId, score, comment); setRatedRides((items) => [...items, rideId]); setNotice('Rating submitted successfully.') } catch (error) { setNotice(error.response?.data?.message || 'Unable to submit rating.') }
  }

  return <section className="workflow-page"><Link className="back-link" to="/dashboard/passenger"><ArrowLeft size={15} /> Back to booking</Link><p className="eyebrow">PASSENGER HISTORY</p><h1>Your rides.</h1>{notice && <p className="notice">{notice}</p>}{payments.length > 0 && <div className="payment-summary"><span>PAYMENT HISTORY</span><strong>{payments.length} payment{payments.length === 1 ? '' : 's'} · Rs {payments.reduce((total, payment) => total + payment.amount, 0).toFixed(0)}</strong></div>}{rides.length ? <div className="history-list">{rides.map((ride) => <article className="history-row" key={ride.id}><div><strong>{ride.vehicleType} ride · Rs {ride.fare.toFixed(0)}</strong><span>{ride.distanceKm} km · {ride.paymentMethod} · {new Date(ride.createdAt).toLocaleDateString()}{ride.discountAmount > 0 ? ` · Rs ${ride.discountAmount.toFixed(0)} off (${ride.promoCode})` : ''}</span></div><div className="history-actions"><span className={`status status-${ride.rideStatus.toLowerCase()}`}>{ride.rideStatus.replaceAll('_', ' ')}</span>{['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(ride.rideStatus) && <button type="button" className="quiet-button" onClick={() => cancel(ride.id)}>Cancel</button>}{ride.rideStatus === 'RIDE_COMPLETED' && ride.paymentMethod === 'online' && ride.paymentStatus !== 'paid' && <button type="button" onClick={() => payOnline(ride.id)}>Pay online</button>}{ride.rideStatus === 'RIDE_COMPLETED' && !ratedRides.includes(ride.id) && <button type="button" className="quiet-button" onClick={() => rateRide(ride.id)}>Rate ride</button>}</div></article>)}</div> : !notice && <p className="empty-state">No rides yet. Your completed trips will appear here.</p>}</section>
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