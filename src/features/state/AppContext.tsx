import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dashboardService, notificationService } from '../services'
import { AppContext } from './useAppState'

type ProjectState = {
  id: string
  name: string
}

export type AppContextValue = {
  project: ProjectState | null
  setProject: (project: ProjectState | null) => void
  notifications: number
  setNotifications: (count: number) => void
}



export function AppStateProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectState | null>({ id: 'p-1', name: 'Northstar Product Launch' })
  const [notifications, setNotifications] = useState<number>(3)

  useEffect(() => {
    let active = true
    void Promise.all([
    dashboardService.getStats().catch(() => null),
    notificationService.list().catch(() => null),
  ]).then(([statsResponse, notificationsResponse]) => {
    if (!active) return
    const nextStats = statsResponse?.data ?? null
    const nextNotifications = notificationsResponse?.data ?? null

    if (nextStats?.project) {
      setProject(nextStats.project)
    }

    if (Array.isArray(nextNotifications)) {
      setNotifications(nextNotifications.filter((item) => item?.unread).length)
    }
    })
    return () => { active = false }
  }, [])

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
