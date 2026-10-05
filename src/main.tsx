import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './features/routes/AppRoutes'
import { AuthProvider } from './features/auth/AuthContext'
import { AppStateProvider } from './features/state/AppContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppStateProvider>
          <AppRoutes />
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)