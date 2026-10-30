import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useState } from 'react'
import { useWorkspaceSnapshot } from './useWorkspaceSnapshot'
import { navItems } from '../routes/navigation'
import './AppShell.css'

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data } = useWorkspaceSnapshot()
  const notifications = (data?.incoming.length || 0) + (data?.artifacts.filter(a => a.status === 'pending').length || 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-badge">A</span>
          <div>
            <strong>Artifactos</strong>
            <small>Workspace</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              onClick={(event) => {
                if (item.to === '/login') {
                  event.preventDefault()
                  logout()
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <form className="search-box" role="search" onSubmit={event => { event.preventDefault(); if (query.trim()) navigate(`/workspace?q=${encodeURIComponent(query.trim())}`) }}>
            <span>Search</span>
            <input aria-label="Search workspace" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search saved workspace data..." /><button type="submit">Search</button>
          </form>
          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label={`Notifications: ${notifications} saved updates`} onClick={() => navigate('/notifications')}>
              🔔
              <span className="notification-count">{notifications}</span>
            </button>
            <div className="user-pill">
              <span className="avatar">{user?.name?.charAt(0) ?? 'U'}</span>
              <span>{user?.name ?? 'User'}</span>
            </div>
          </div>
        </header>

        <main className="content-pane">{children}</main>
      </div>
    </div>
  )
}
