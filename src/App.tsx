import './App.css'
import { AuthProvider } from './features/auth/AuthContext'
import { AppStateProvider } from './features/state/AppContext'
import { AppRoutes } from './features/routes/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <AppRoutes />
      </AppStateProvider>
    </AuthProvider>
  )
}

export default App
