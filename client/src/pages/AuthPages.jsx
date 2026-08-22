import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function AuthLayout({ title, children }) {
  return <main className="auth-page"><Link className="back-link" to="/"><ArrowLeft size={15} /> RideX home</Link><div className="auth-card"><p className="eyebrow">RIDEX ACCOUNT</p><h1>{title}</h1>{children}</div></main>
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try { await login(form); navigate(location.state?.from || '/dashboard', { replace: true }) } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to sign in') } finally { setIsSubmitting(false) }
  }

  return <AuthLayout title="Welcome back."><form className="auth-form" onSubmit={submit}><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-link" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button></form><p className="auth-switch">New to RideX? <Link to="/register">Create an account</Link></p></AuthLayout>
}

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
    try { await register(form); navigate('/login', { state: { registered: true } }) } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create account') } finally { setIsSubmitting(false) }
  }

  return <AuthLayout title="Make the next move."><form className="auth-form" onSubmit={submit}><label>Name<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Password<input type="password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-link" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create passenger account'} <ArrowRight size={16} /></button></form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p></AuthLayout>
}

export { LoginPage, RegisterPage }
