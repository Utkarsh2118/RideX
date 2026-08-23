import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })))
const AdminDashboard = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.AdminDashboard })))
const DriverDashboard = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.DriverDashboard })))
const PassengerDashboard = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.PassengerDashboard })))
const DriverOnboardingPage = lazy(() => import('./pages/WorkflowPages').then((module) => ({ default: module.DriverOnboardingPage })))
const RideHistoryPage = lazy(() => import('./pages/WorkflowPages').then((module) => ({ default: module.RideHistoryPage })))
import './App.css'

function DashboardRedirect() {
  const { user } = useAuth()
  return <Navigate to={`/dashboard/${user.role}`} replace />
}

function App() {
  return <AuthProvider><BrowserRouter><Suspense fallback={<div className="screen-state">Loading RideX...</div>}><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardRedirect />} /><Route element={<ProtectedRoute roles={['passenger']} />}><Route path="/dashboard/passenger" element={<PassengerDashboard />} /><Route path="/rides" element={<RideHistoryPage />} /></Route><Route element={<ProtectedRoute roles={['passenger', 'driver']} />}><Route path="/driver/onboarding" element={<DriverOnboardingPage />} /></Route><Route element={<ProtectedRoute roles={['driver']} />}><Route path="/dashboard/driver" element={<DriverDashboard />} /></Route><Route element={<ProtectedRoute roles={['admin']} />}><Route path="/dashboard/admin" element={<AdminDashboard />} /></Route></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></BrowserRouter></AuthProvider>
}

export default App
