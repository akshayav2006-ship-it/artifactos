import apiClient from '../api/apiClient'

export const authService = {
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
}

export const dashboardService = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getActivity: () => apiClient.get('/dashboard/activity'),
}

export const searchService = {
  search: (query: string, filters?: Record<string, string>) =>
    apiClient.get('/search', { params: { query, ...filters } }),
  getSuggestions: (query: string) => apiClient.get('/search/suggestions', { params: { query } }),
  getRecent: () => apiClient.get('/search/recent'),
}

export const artifactService = {
  list: () => apiClient.get('/artifacts'),
  getById: (id: string) => apiClient.get(`/artifacts/${id}`),
  update: (id: string, payload: Record<string, unknown>) => apiClient.put(`/artifacts/${id}`, payload),
}

export const notificationService = {
  list: () => apiClient.get('/notifications'),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
}

export const analyticsService = {
  getOverview: () => apiClient.get('/analytics'),
  getReports: () => apiClient.get('/analytics/reports'),
}
