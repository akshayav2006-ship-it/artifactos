import { AvailabilityPage, SearchPage, NotificationsPage } from '../app-shell/WorkspacePages'
import type { ReactNode } from 'react'
import App from '../../App'
import { Navigate } from 'react-router-dom'
import { AppShell } from '../app-shell/AppShell'
import { ArtifactManagement } from '../artifacts/ArtifactManagement'
import { LoginPage } from '../auth/LoginPage'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { ProfilePage } from '../profile/ProfilePage'
import { ProjectWorkspacePage } from '../projects/ProjectWorkspace'
import { SettingsPage } from '../settings/SettingsPage'
import { WorkspaceCommandCenter } from '../step4/WorkspaceCommandCenter'

type RouteConfigEntry = {
  path: string
  element: ReactNode
}

function withShell(children: ReactNode): ReactNode {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

export const routeConfig: RouteConfigEntry[] = [
  { path: '/workspace', element: <App /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: withShell(<Navigate to="/dashboard" replace />),
  },
  {
    path: '/dashboard',
    element: withShell(<WorkspaceCommandCenter initialTab="overview" />),
  },
  {
    path: '/projects',
    element: withShell(<ProjectWorkspacePage />),
  },
  {
    path: '/chat',
    element: <App />,
  },
  {
    path: '/artifacts',
    element: withShell(<ArtifactManagement />),
  },
  {
    path: '/search',
    element: withShell(<SearchPage />),
  },
  {
    path: '/assistant',
    element: withShell(<AvailabilityPage title="AI Assistant" />),
  },
  {
    path: '/analytics',
    element: withShell(<AvailabilityPage title="Analytics" />),
  },
  {
    path: '/knowledge-graph',
    element: withShell(<AvailabilityPage title="Knowledge Graph" />),
  },
  {
    path: '/notifications',
    element: withShell(<NotificationsPage />),
  },
  {
    path: '/settings',
    element: withShell(<SettingsPage />),
  },
  {
    path: '/profile',
    element: withShell(<ProfilePage />),
  },
  { path: '*', element: withShell(<AvailabilityPage title="Page unavailable" />) },
]
