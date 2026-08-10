import type { ReactNode } from 'react'
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
    element: withShell(<WorkspaceCommandCenter initialTab="overview" />),
  },
  {
    path: '/artifacts',
    element: withShell(<ArtifactManagement />),
  },
  {
    path: '/search',
    element: withShell(<Navigate to="/dashboard" replace />),
  },
  {
    path: '/assistant',
    element: withShell(<Navigate to="/dashboard" replace />),
  },
  {
    path: '/analytics',
    element: withShell(<Navigate to="/dashboard" replace />),
  },
  {
    path: '/knowledge-graph',
    element: withShell(<Navigate to="/dashboard" replace />),
  },
  {
    path: '/notifications',
    element: withShell(<WorkspaceCommandCenter initialTab="notifications" />),
  },
  {
    path: '/settings',
    element: withShell(<SettingsPage />),
  },
  {
    path: '/profile',
    element: withShell(<ProfilePage />),
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]
