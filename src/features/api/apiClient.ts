import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('artifactos_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('artifactos_refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('artifactos_access_token')
        localStorage.removeItem('artifactos_refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`, {
          refreshToken,
        })

        const nextToken = response.data?.token || response.data?.accessToken
        if (nextToken) {
          localStorage.setItem('artifactos_access_token', nextToken)
          originalRequest.headers.Authorization = `Bearer ${nextToken}`
          return apiClient(originalRequest)
        }
      } catch {
        localStorage.removeItem('artifactos_access_token')
        localStorage.removeItem('artifactos_refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
