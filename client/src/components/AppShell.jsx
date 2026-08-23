import { LogOut, UserRound } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import NotificationCenter from './NotificationCenter'

function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link className="nav-brand" to="/dashboard"><span>R</span> RIDEX</Link>
        <div className="nav-user">
          <UserRound size={16} />
          <span>{user.name}</span>
          <NotificationCenter />
          <button type="button" className="icon-button" aria-label="Log out" title="Log out" onClick={logout}><LogOut size={17} /></button>
        </div>
      </header>
      <nav className="shell-links">{user.role === 'passenger' && <><Link to="/dashboard/passenger">Book ride</Link><Link to="/rides">Ride history</Link><Link to="/driver/onboarding">Become a driver</Link></>}{user.role === 'driver' && <Link to="/dashboard/driver">Driver desk</Link>}{user.role === 'admin' && <Link to="/dashboard/admin">Operations</Link>}</nav><main className="shell-content"><Outlet /></main>
    </div>
  )
}

export default AppShell
