import { Route, Routes } from 'react-router-dom'
import { routeConfig } from './routeConfig'

export function AppRoutes() {
  return (
    <Routes>
      {routeConfig.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  )
}
