import { Navigate, useLocation } from 'react-router-dom'

export function WorkspaceSearchRedirect() {
  const { search } = useLocation()
  const query = new URLSearchParams(search).get('q') || ''
  return <Navigate to={`/workspace?q=${encodeURIComponent(query)}`} replace />
}

