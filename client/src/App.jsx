import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { AdminDashboard, DriverDashboard, PassengerDashboard } from './pages/DashboardPages'
import LandingPage from './pages/LandingPage'
import { DriverOnboardingPage, RideHistoryPage } from './pages/WorkflowPages'
import './App.css'

function DashboardRedirect() {
  const { user } = useAuth()
  return <Navigate to={`/dashboard/${user.role}`} replace />
}

function App() {
  return <AuthProvider><BrowserRouter><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardRedirect />} /><Route element={<ProtectedRoute roles={['passenger']} />}><Route path="/dashboard/passenger" element={<PassengerDashboard />} /><Route path="/rides" element={<RideHistoryPage />} /></Route><Route element={<ProtectedRoute roles={['passenger', 'driver']} />}><Route path="/driver/onboarding" element={<DriverOnboardingPage />} /></Route><Route element={<ProtectedRoute roles={['driver']} />}><Route path="/dashboard/driver" element={<DriverDashboard />} /></Route><Route element={<ProtectedRoute roles={['admin']} />}><Route path="/dashboard/admin" element={<AdminDashboard />} /></Route></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter></AuthProvider>
}

export default App
