import { LogOut, UserRound } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link className="nav-brand" to="/dashboard"><span>R</span> RIDEX</Link>
        <div className="nav-user">
          <UserRound size={16} />
          <span>{user.name}</span>
          <button type="button" className="icon-button" aria-label="Log out" title="Log out" onClick={logout}><LogOut size={17} /></button>
        </div>
      </header>
      <main className="shell-content"><Outlet /></main>
    </div>
  )
}

export default AppShell
