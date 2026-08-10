import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAppState } from '../state/AppContext'
import './AppShell.css'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Projects', to: '/projects' },
  { label: 'AI Chat', to: '/chat' },
  { label: 'Artifacts', to: '/artifacts' },
  { label: 'Semantic Search', to: '/search' },
  { label: 'AI Assistant', to: '/assistant' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Knowledge Graph', to: '/knowledge-graph' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Settings', to: '/settings' },
  { label: 'Profile', to: '/profile' },
  { label: 'Logout', to: '/login' },
]

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const { notifications } = useAppState()

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
          <div className="search-box">
            <span>Search</span>
            <input type="text" placeholder="Search artifacts, projects, prompts..." />
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button">
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
