import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dashboardService, notificationService } from '../services'

type ProjectState = {
  id: string
  name: string
}

type AppContextValue = {
  project: ProjectState | null
  setProject: (project: ProjectState | null) => void
  notifications: number
  setNotifications: (count: number) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectState | null>({ id: 'p-1', name: 'Northstar Product Launch' })
  const [notifications, setNotifications] = useState<number>(3)

  void Promise.all([
    dashboardService.getStats().catch(() => null),
    notificationService.list().catch(() => null),
  ]).then(([statsResponse, notificationsResponse]) => {
    const nextStats = statsResponse?.data ?? null
    const nextNotifications = notificationsResponse?.data ?? null

    if (nextStats?.project) {
      setProject(nextStats.project)
    }

    if (Array.isArray(nextNotifications)) {
      setNotifications(nextNotifications.filter((item) => item?.unread).length)
    }
  })

  const value = useMemo<AppContextValue>(
    () => ({
      project,
      setProject,
      notifications,
      setNotifications,
    }),
    [notifications, project],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
