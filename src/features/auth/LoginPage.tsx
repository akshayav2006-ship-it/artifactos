import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import './LoginPage.css'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <span className="auth-badge">Artifactos</span>
          <h1>Trusted AI work, organized in one space.</h1>
          <p>Create projects, review artifacts, manage approvals, and keep your team aligned with a single intelligent workspace.</p>
        </section>

        <form className="auth-card" onSubmit={handleSubmit}>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to continue</h2>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="any password" required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="auth-footer">Demo mode: Enter any email and password to continue</p>
        </form>
      </div>
    </div>
  )
}
