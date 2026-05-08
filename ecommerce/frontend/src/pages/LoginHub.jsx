import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginHub() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px', color: 'white' }}>
          <h1 style={{ fontSize: '2.5em', marginBottom: '10px', fontWeight: '700' }}>🏪 VendorHub</h1>
          <p style={{ fontSize: '1.1em', opacity: 0.95 }}>Multi-vendor marketplace platform</p>
          <p style={{ fontSize: '0.95em', opacity: 0.8, marginTop: '5px' }}>Choose your role to get started</p>
        </div>

        {/* 3 Login Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
          {/* Customer Login */}
          <Link
            to="/customer/login"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
              border: '2px solid transparent',
              textDecoration: 'none',
              display: 'block'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'
              e.currentTarget.style.borderColor = '#667eea'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>👤</div>
            <h2 style={{ fontSize: '1.5em', marginBottom: '10px', color: '#333', fontWeight: '600' }}>Customer</h2>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.95em' }}>
              Browse products, add to cart, and place orders
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1em',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => e.target.style.opacity = '0.9'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              Login as Customer
            </button>
          </Link>

          {/* Vendor/Seller Login */}
          <Link
            to="/vendor/login"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
              border: '2px solid transparent',
              textDecoration: 'none',
              display: 'block'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'
              e.currentTarget.style.borderColor = '#764ba2'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏬</div>
            <h2 style={{ fontSize: '1.5em', marginBottom: '10px', color: '#333', fontWeight: '600' }}>Vendor/Seller</h2>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.95em' }}>
              Manage products, track orders, and grow your business
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1em',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => e.target.style.opacity = '0.9'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              Login as Vendor
            </button>
          </Link>

          {/* Admin Login */}
          <Link
            to="/admin/login"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
              border: '2px solid transparent',
              textDecoration: 'none',
              display: 'block'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'
              e.currentTarget.style.borderColor = '#f093fb'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>⚙️</div>
            <h2 style={{ fontSize: '1.5em', marginBottom: '10px', color: '#333', fontWeight: '600' }}>Admin</h2>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.95em' }}>
              Manage platform, approve vendors, and view analytics
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1em',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => e.target.style.opacity = '0.9'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              Login as Admin
            </button>
          </Link>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: 'white', opacity: 0.8 }}>
          <p>Don't have an account? Create one during login</p>
          <p style={{ fontSize: '0.9em', marginTop: '10px' }}>All roles support password reset and Google OAuth</p>
        </div>

        {/* Bottom action - Browse as Guest */}
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 30px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              fontSize: '1em',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => {
              e.target.style.background = 'rgba(255,255,255,0.3)'
            }}
            onMouseLeave={e => {
              e.target.style.background = 'rgba(255,255,255,0.2)'
            }}
          >
            Browse as Guest (No login required)
          </button>
          <p style={{ color: 'white', opacity: 0.7, fontSize: '0.85em', marginTop: '15px' }}>
            ℹ️ You can browse products, but to place an order you'll need to log in
          </p>
        </div>
      </div>
    </div>
  )
}
