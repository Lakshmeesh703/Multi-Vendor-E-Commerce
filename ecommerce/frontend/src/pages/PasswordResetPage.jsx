import { useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { completePasswordReset, requestPasswordReset } from '../api'

export default function PasswordResetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const role = searchParams.get('role') || 'customer'
  const isResetMode = useMemo(() => Boolean(token), [token])
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    try {
      const result = await requestPasswordReset(email, role)
      setMessage(`Reset link created: ${result.resetUrl}`)
    } catch (err) {
      setError(err.message || 'Reset request failed')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    try {
      await completePasswordReset(token, newPassword)
      setMessage('Password updated successfully. You can log in again.')
      setTimeout(() => navigate(`/${role}/login`), 1000)
    } catch (err) {
      setError(err.message || 'Password reset failed')
    }
  }

  return (
    <div className="auth-page">
      <h2>Password Reset</h2>
      {isResetMode ? (
        <form onSubmit={handleReset} className="auth-form">
          <label>New password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}
          <button type="submit">Update password</button>
        </form>
      ) : (
        <form onSubmit={handleRequest} className="auth-form">
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} required />
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}
          <button type="submit">Send reset link</button>
        </form>
      )}
    </div>
  )
}
