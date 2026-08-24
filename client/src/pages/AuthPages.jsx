import { useState } from 'react'
import { ArrowLeft, ArrowRight, CarFront, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const PORTALS = {
  passenger: {
    path: '/login/user',
    label: 'Rider',
    eyebrow: 'RIDER LOGIN',
    title: 'Welcome back.',
    icon: UserIcon,
    dashboard: '/dashboard/passenger',
    mismatch: 'This is a rider login. Use the driver or admin portal for that account.',
  },
  driver: {
    path: '/login/driver',
    label: 'Driver',
    eyebrow: 'DRIVER LOGIN',
    title: "Let's get you on the road.",
    icon: CarFront,
    dashboard: '/dashboard/driver',
    mismatch: 'This is a driver login. Use the rider or admin portal for that account.',
  },
  admin: {
    path: '/login/admin',
    label: 'Admin',
    eyebrow: 'ADMIN LOGIN',
    title: 'Sign in to the control room.',
    icon: ShieldCheck,
    dashboard: '/dashboard/admin',
    mismatch: 'This is the admin login. Use the rider or driver portal for that account.',
  },
}

function AuthLayout({ title, eyebrow, children }) {
  return <main className="auth-page"><Link className="back-link" to="/"><ArrowLeft size={15} /> RideX home</Link><div className="auth-card"><p className="eyebrow">{eyebrow || 'RIDEX ACCOUNT'}</p><h1>{title}</h1>{children}</div></main>
}

function PortalChooserPage() {
  return (
    <AuthLayout eyebrow="CHOOSE YOUR PORTAL" title="Who's signing in?">
      <div className="portal-grid">
        {Object.values(PORTALS).map(({ path, label, icon: Icon }) => (
          <Link className="portal-card" key={path} to={path}>
            <Icon size={22} />
            <strong>{label}</strong>
            <span>Sign in <ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>
      <p className="auth-switch">New to RideX? <Link to="/register">Create a rider account</Link></p>
    </AuthLayout>
  )
}

function RoleLoginPage({ role }) {
  const portal = PORTALS[role]
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await login(form)
      const signedInRole = result.data.user.role
      if (signedInRole !== role) {
        logout()
        setError(portal.mismatch)
        return
      }
      navigate(location.state?.from || portal.dashboard, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow={portal.eyebrow} title={portal.title}>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-link" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : `Sign in as ${portal.label}`} <ArrowRight size={16} /></button>
      </form>
      <p className="auth-switch">Not {portal.label.toLowerCase()}? <Link to="/login">Choose a different portal</Link></p>
      {role === 'passenger' && <p className="auth-switch">New to RideX? <Link to="/register">Create an account</Link></p>}
    </AuthLayout>
  )
}

function PassengerLoginPage() { return <RoleLoginPage role="passenger" /> }
function DriverLoginPage() { return <RoleLoginPage role="driver" /> }
function AdminLoginPage() { return <RoleLoginPage role="admin" /> }

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try { await register(form); navigate('/login/user', { state: { registered: true } }) } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create account') } finally { setIsSubmitting(false) }
  }

  return <AuthLayout title="Make the next move."><form className="auth-form" onSubmit={submit}><label>Name<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Password<input type="password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-link" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create passenger account'} <ArrowRight size={16} /></button></form><p className="auth-switch">Already registered? <Link to="/login/user">Sign in</Link></p></AuthLayout>
}

export { PortalChooserPage, PassengerLoginPage, DriverLoginPage, AdminLoginPage, RegisterPage }