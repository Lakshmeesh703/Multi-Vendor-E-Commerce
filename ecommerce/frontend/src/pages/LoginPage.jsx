import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginAdmin, loginCustomer, loginVendor, registerAdmin, registerCustomer, registerVendor, setAuthToken } from '../api'
import '../styles/LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRole = searchParams.get('role') || 'customer'
  const initialMode = searchParams.get('mode') || 'login'

  const [selectedRole, setSelectedRole] = useState(['customer', 'vendor', 'admin'].includes(initialRole) ? initialRole : 'customer')
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const testCredentials = {
    customer: { email: 'customer@vendorhub.local', password: 'customer123' },
    vendor: { email: 'vendor@vendorhub.local', password: 'vendor123' },
    admin: { email: 'admin@vendorhub.local', password: 'admin123' }
  }

  const handleQuickLogin = (role) => {
    const creds = testCredentials[role]
    setEmail(creds.email)
    setPassword(creds.password)
    setConfirmPassword('')
    setSelectedRole(role)
    setMode('login')
  }

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'vendorhub-oauth' && event.data?.token && event.data?.user?.role) {
        setAuthToken(event.data.token, event.data.user.role)
        navigate(routeAfterAuth(event.data.user.role))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate])

  const syncUrlState = (nextRole, nextMode) => {
    const params = new URLSearchParams(searchParams)
    params.set('role', nextRole)
    params.set('mode', nextMode)
    setSearchParams(params, { replace: true })
  }

  const routeAfterAuth = (role) => {
    const roleRoutes = {
      customer: '/shop',
      vendor: '/vendor-dashboard',
      admin: '/admin-dashboard'
    }
    return roleRoutes[role] || '/shop'
  }

  const openGoogleLogin = () => {
    window.open(`/api/auth/google/start?role=${selectedRole}`, 'google-login', 'width=520,height=700')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const trimmedEmail = String(email || '').trim()
      const trimmedPassword = String(password || '')

      if (!trimmedEmail.includes('@')) {
        setError('Please enter a valid email address.')
        return
      }

      if (mode === 'register') {
        if (String(name || '').trim().length < 2) {
          setError('Name must be at least 2 characters.')
          return
        }
        if (selectedRole === 'vendor' && String(shopName || '').trim().length < 2) {
          setError('Shop name must be at least 2 characters.')
          return
        }
        if (trimmedPassword.length < 6) {
          setError('Password must be at least 6 characters.')
          return
        }
        if (trimmedPassword !== confirmPassword) {
          setError('Password and confirm password do not match.')
          return
        }
      }

      let result = null
      if (mode === 'register') {
        if (selectedRole === 'admin') {
          result = await registerAdmin({ name, email: trimmedEmail, password: trimmedPassword })
        } else if (selectedRole === 'vendor') {
          result = await registerVendor({ name, shopName, email: trimmedEmail, password: trimmedPassword })
        } else {
          result = await registerCustomer({ name, email: trimmedEmail, password: trimmedPassword })
        }
      } else {
        const authFn = selectedRole === 'vendor' ? loginVendor : selectedRole === 'admin' ? loginAdmin : loginCustomer
        result = await authFn(trimmedEmail, trimmedPassword)
      }

      if (result?.token) {
        setAuthToken(result.token, result.user?.role || selectedRole)

        const role = result.user?.role || selectedRole
        navigate(routeAfterAuth(role))
      } else {
        setError(mode === 'register' ? 'Registration failed. Please check your details.' : 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      setError(err.message || (mode === 'register' ? 'Registration error. Try again.' : 'Login error. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-container role-${selectedRole}`}>
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <h1>🏪 VendorHub</h1>
          <p className="subtitle">Professional Multi-Role E-Commerce Platform</p>
        </div>

        {/* Role Selection */}
        <div className="role-selector">
          <p className="role-label">Select your role:</p>
          <div className="role-buttons">
            <button
              type="button"
              className={`role-btn role-customer ${selectedRole === 'customer' ? 'active' : ''}`}
              onClick={() => {
                setSelectedRole('customer')
                syncUrlState('customer', mode)
              }}
            >
              <span className="role-icon">👥</span>
              Customer
            </button>
            <button
              type="button"
              className={`role-btn role-vendor ${selectedRole === 'vendor' ? 'active' : ''}`}
              onClick={() => {
                setSelectedRole('vendor')
                syncUrlState('vendor', mode)
              }}
            >
              <span className="role-icon">🏬</span>
              Vendor
            </button>
            <button
              type="button"
              className={`role-btn role-admin ${selectedRole === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setSelectedRole('admin')
                syncUrlState('admin', mode)
              }}
            >
              <span className="role-icon">⚙️</span>
              Admin
            </button>
          </div>
        </div>

        {/* Mode selection */}
        <div className="quick-login" style={{ marginTop: 0 }}>
          <button
            className="quick-btn"
            type="button"
            onClick={() => {
              const next = mode === 'login' ? 'register' : 'login'
              setMode(next)
              syncUrlState(selectedRole, next)
              setError('')
            }}
          >
            {mode === 'login' ? '➕ Create account' : '↩︎ Back to login'}
          </button>
        </div>

        {/* Quick Test Credentials */}
        <div className="quick-login">
          <button
            className="quick-btn"
            type="button"
            onClick={() => handleQuickLogin(selectedRole)}
          >
            📋 Use Test {selectedRole === 'customer' ? 'Customer' : selectedRole === 'vendor' ? 'Vendor' : 'Admin'} Credentials
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          {mode === 'register' && selectedRole === 'vendor' && (
            <div className="form-group">
              <label htmlFor="shopName">Shop Name</label>
              <input
                id="shopName"
                type="text"
                placeholder="Your store name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="your@vendorhub.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === 'register' && <small className="form-help">Use at least 6 characters.</small>}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show entered password
            </label>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="error-message">❌ {error}</div>}

          <button type="submit" className={`login-btn role-${selectedRole}`} disabled={loading}>
            {loading ? (mode === 'register' ? '🔄 Creating account...' : '🔄 Logging in...') : (mode === 'register' ? '✅ Create account' : '🔓 Login')}
          </button>

          {mode === 'login' && (selectedRole === 'vendor' || selectedRole === 'admin') && (
            <button type="button" className="google-btn" onClick={openGoogleLogin}>
              🔑 Continue with Google
            </button>
          )}
        </form>

        {/* Test Credentials Info */}
        <div className="credentials-info">
          <p className="info-title">📖 Local Test Credentials (Development)</p>
          <div className="credential-group">
            <strong>Customer:</strong>
            <code>customer@vendorhub.local / customer123</code>
          </div>
          <div className="credential-group">
            <strong>Vendor:</strong>
            <code>vendor@vendorhub.local / vendor123</code>
          </div>
          <div className="credential-group">
            <strong>Admin:</strong>
            <code>admin@vendorhub.local / admin123</code>
          </div>
          <p className="info-note">💡 For vendor/admin, Google login is also available on the login page.</p>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2024 VendorHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
