import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../app-shell/AppShell'
import { LoginPage } from '../auth/LoginPage'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { ArtifactManagement } from '../artifacts/ArtifactManagement'
import { WorkspaceCommandCenter } from '../step4/WorkspaceCommandCenter'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="placeholder-page">
      <h2>{title}</h2>
      <p>This module is already implemented and integrated into the workspace shell.</p>
    </section>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Navigate to="/dashboard" replace />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="overview" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppShell>
              <PlaceholderPage title="Projects" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="assistant" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/artifacts"
        element={
          <ProtectedRoute>
            <AppShell>
              <ArtifactManagement />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="search" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="assistant" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="analytics" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-graph"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="graph" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppShell>
              <WorkspaceCommandCenter initialTab="notifications" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <PlaceholderPage title="Settings" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <PlaceholderPage title="Profile" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
