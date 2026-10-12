import { createContext, useContext } from 'react'
import type { AppContextValue } from './AppContext'

export const AppContext = createContext<AppContextValue | undefined>(undefined)

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
