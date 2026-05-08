import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginVendor, setAuthToken } from '../api'

export default function VendorLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginVendor(email, password)
      if (res?.token && res.user?.role === 'vendor') {
        setAuthToken(res.token)
        navigate('/vendor-dashboard')
      } else {
        setError('Invalid vendor credentials')
      }
    } catch (err) {
      setError(err.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏬</div>
          <h1 style={{ fontSize: '2em', marginBottom: '5px', color: 'white', fontWeight: '700' }}>Vendor Portal</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95em' }}>Manage your store, products & orders</p>
        </div>

        {/* Login Form */}
        <form onSubmit={submit} style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
          {/* Email Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.95em', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Email or Store Name</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vendor@vendorhub.local"
              required
              style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1em', transition: 'border-color 0.3s', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#764ba2'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.95em', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1em', transition: 'border-color 0.3s', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#764ba2'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: '0.92em', fontWeight: 600, color: '#666' }}>
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show entered password
            </label>
          </div>

          {/* Error Message */}
          {error && <div style={{ background: '#fee', color: '#c33', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.95em' }}>⚠️ {error}</div>}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1em',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.3s',
              marginBottom: '12px'
            }}
            onMouseEnter={e => !loading && (e.target.style.opacity = '0.9')}
            onMouseLeave={e => !loading && (e.target.style.opacity = '1')}
          >
            {loading ? 'Signing in...' : 'Sign in as Vendor'}
          </button>

          {/* Forgot Password Link */}
          <button
            type="button"
            onClick={() => navigate('/reset-password?role=vendor')}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              color: '#764ba2',
              border: 'none',
              fontSize: '0.95em',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot password?
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '25px', color: 'white' }}>
          <p style={{ fontSize: '0.95em', marginBottom: '10px' }}>Don't have a vendor account?</p>
          <button
            onClick={() => navigate('/login?role=vendor&mode=register')}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              fontSize: '0.95em',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            Create vendor account
          </button>
        </div>
      </div>
    </div>
  )
}
