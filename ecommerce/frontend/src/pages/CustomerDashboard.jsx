import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCustomerSummary, getAuthUserId } from '../api'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    setUser({ id: getAuthUserId(), name: 'Customer' })
    fetchCustomerSummary().then(setSummary).catch(() => setSummary(null))
  }, [])

  const quickActions = useMemo(() => ([
    { label: 'Continue shopping', description: 'Browse the product catalog', onClick: () => navigate('/shop') },
    { label: 'Open cart', description: 'Review items before checkout', onClick: () => navigate('/cart') },
    { label: 'View wishlist', description: 'Save ideas for later', onClick: () => navigate('/wishlist') },
    { label: 'Checkout', description: 'Complete your purchase', onClick: () => navigate('/checkout') },
  ]), [navigate])

  const recentOrders = summary?.recentOrders || []

  return (
    <section className="dashboard-layout customer-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>👤 Customer Center</h2>
          <p className="sidebar-subtitle">Shop, track and manage orders</p>
        </div>
        <nav className="sidebar-menu">
          <button type="button" className="menu-item active" onClick={() => navigate('/customer/dashboard')}>Overview</button>
          <button type="button" className="menu-item" onClick={() => navigate('/shop')}>Shop</button>
          <button type="button" className="menu-item" onClick={() => navigate('/cart')}>Cart</button>
          <button type="button" className="menu-item" onClick={() => navigate('/wishlist')}>Wishlist</button>
          <button type="button" className="menu-item" onClick={() => navigate('/checkout')}>Checkout</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-hero panel-card">
          <div>
            <span className="eyebrow">Customer account</span>
            <h1>Welcome back{user?.name ? `, ${user.name}` : ''}</h1>
            <p className="header-subtitle">Your cart, orders and saved items stay in one place while you keep shopping.</p>
          </div>
          <div className="hero-chip-row">
            <span>{summary?.cartCount ?? 0} cart items</span>
            <span>{summary?.orderCount ?? 0} orders</span>
            <span>₹{Number(summary?.totalSpent || 0).toLocaleString('en-IN')}</span>
          </div>
        </header>

        <section className="dashboard-cards">
          <div className="card"><div className="card-icon">🛒</div><div className="card-content"><h3>Cart Items</h3><p className="card-value">{summary?.cartCount ?? '—'}</p><p className="card-label">Ready for checkout</p></div></div>
          <div className="card"><div className="card-icon">📦</div><div className="card-content"><h3>Orders</h3><p className="card-value">{summary?.orderCount ?? '—'}</p><p className="card-label">Delivered and active</p></div></div>
          <div className="card"><div className="card-icon">💖</div><div className="card-content"><h3>Address</h3><p className="card-value">{summary?.address ? 'Saved' : '—'}</p><p className="card-label">Profile updated</p></div></div>
          <div className="card"><div className="card-icon">💳</div><div className="card-content"><h3>Payments</h3><p className="card-value">₹{Number(summary?.totalSpent || 0).toLocaleString('en-IN')}</p><p className="card-label">Lifetime spend</p></div></div>
        </section>

        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-grid">
            {quickActions.map(action => (
              <button key={action.label} type="button" className="action-card" onClick={action.onClick}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <button type="button" className="ghost-link" onClick={() => navigate('/shop')}>Back to shopping</button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <h3>No orders yet</h3>
              <p>Start with a featured product, then come back here to track progress and re-order.</p>
            </div>
          ) : (
            <table className="dashboard-table">
              <thead><tr><th>Order ID</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td><span className="badge shipped">{order.status || 'Active'}</span></td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </section>
  )
}
