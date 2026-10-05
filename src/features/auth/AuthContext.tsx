import { createContext, useContext, useMemo, useState } from 'react'
import { authService } from '../services'

type AuthUser = {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Reviewer' | 'Member'
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'artifactos_user'
const TOKEN_KEY = 'artifactos_access_token'
const REFRESH_KEY = 'artifactos_refresh_token'

function hydrateUser(): AuthUser | null {
  const savedUser = localStorage.getItem(STORAGE_KEY)
  if (!savedUser) {
    return null
  }

  try {
    return JSON.parse(savedUser) as AuthUser
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => hydrateUser())

  const persistSession = (nextUser: AuthUser, accessToken?: string, refreshToken?: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken)
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken)
    }
    setUser(nextUser)
  }

  const login = async (email: string, password: string) => {
    if (!email || !password) return

    try {
      const response = await authService.login(email, password)
      const payload = response.data ?? {}
      const nextUser: AuthUser = {
        id: payload.user?.id ?? payload.id ?? 'user-1',
        name: payload.user?.name ?? payload.name ?? 'Maya Chen',
        email: payload.user?.email ?? payload.email ?? email,
        role: payload.user?.role ?? payload.role ?? 'Owner',
      }

      persistSession(
        nextUser,
        payload.accessToken ?? payload.token ?? 'demo-access-token',
        payload.refreshToken ?? payload.refresh ?? 'demo-refresh-token',
      )
      return
    } catch {
      // Accept any email/password in demo mode - derive name from email
      const nameParts = email.split('@')[0].split(/[._-]+/)
      const displayName = nameParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')

      const fallbackUser: AuthUser = {
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        name: displayName || 'Demo User',
        email,
        role: 'Owner',
      }

      persistSession(fallbackUser, 'demo-access-token', 'demo-refresh-token')
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
