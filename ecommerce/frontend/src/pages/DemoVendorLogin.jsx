import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginVendor } from '../api'

export default function DemoVendorLogin() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Logging in...')

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        const res = await loginVendor('vendor@vendorhub.local', 'vendor123')
        if (!mounted) return
        if (res?.token) {
          setStatus('Login successful — redirecting')
          setTimeout(() => navigate('/vendor-dashboard'), 600)
        } else {
          setStatus('Login failed: ' + (res?.error || 'unknown'))
        }
      } catch (err) {
        if (!mounted) return
        setStatus('Login error: ' + (err.message || err))
      }
    }
    run()
    return () => { mounted = false }
  }, [navigate])

  return (
    <div style={{padding: 24}}>
      <h2>Demo Vendor Auto-Login</h2>
      <p>{status}</p>
      <p>If this doesn't redirect, open <a href="/vendor/login">Vendor Login</a> and sign in manually.</p>
    </div>
  )
}
