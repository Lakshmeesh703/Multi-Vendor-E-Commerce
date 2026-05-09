import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminPendingVendors, fetchAdminSummary, approveVendor, rejectVendor, getAuthUserId } from '../api'
import '../styles/DashboardPages.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)
  const [pendingVendors, setPendingVendors] = useState([])

  useEffect(() => {
    const userId = getAuthUserId('admin')
    setUser({ id: userId, name: 'Platform Admin' })
  }, [])

  useEffect(() => {
    fetchAdminSummary().then(setSummary).catch(() => setSummary(null))
    fetchAdminPendingVendors().then(setPendingVendors).catch(() => setPendingVendors([]))
  }, [])

  const quickActions = useMemo(() => ([
    { label: 'Review vendors', description: 'Open the approval queue', onClick: () => document.getElementById('vendor-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    { label: 'Inspect orders', description: 'Check platform activity', onClick: () => document.getElementById('platform-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    { label: 'Open catalog', description: 'Browse live marketplace items', onClick: () => navigate('/products') },
    { label: 'Go to home', description: 'Return to the public storefront', onClick: () => navigate('/') },
  ]), [navigate])

  const refreshPendingQueue = async () => {
    const nextSummary = await fetchAdminSummary()
    const next = await fetchAdminPendingVendors()
    setSummary(nextSummary)
    setPendingVendors(next)
  }

  const handleApprove = async (vendorId) => {
    await approveVendor(vendorId)
    await refreshPendingQueue()
  }

  const handleReject = async (vendorId) => {
    await rejectVendor(vendorId)
    await refreshPendingQueue()
  }

  return (
    <section className="dashboard-layout admin-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>⚙️ Admin Portal</h2>
          <p className="sidebar-subtitle">Govern vendors, users and platform health</p>
        </div>
        <nav className="sidebar-menu">
          <button type="button" className="menu-item active" onClick={() => navigate('/admin-dashboard')}>Overview</button>
          <button type="button" className="menu-item" onClick={() => document.getElementById('vendor-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Vendors</button>
          <button type="button" className="menu-item" onClick={() => navigate('/products')}>Catalog</button>
          <button type="button" className="menu-item" onClick={() => document.getElementById('platform-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Health</button>
          <button type="button" className="menu-item" onClick={() => navigate('/')}>Storefront</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-hero panel-card">
          <div>
            <span className="eyebrow">Administration</span>
            <h1>Platform control center</h1>
            <p className="header-subtitle">Approve vendors, watch activity, and keep the marketplace stable from one place.</p>
          </div>
          <div className="hero-chip-row">
            <span>{summary?.users ?? 0} users</span>
            <span>{summary?.vendors ?? 0} vendors</span>
            <span>₹{Number(summary?.totalSales || 0).toLocaleString('en-IN')}</span>
          </div>
        </header>

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

        <section className="dashboard-cards">
          <div className="card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h3>Total Users</h3>
              <p className="card-value">{summary?.users ?? '—'}</p>
              <p className="card-label">Active accounts</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">🏬</div>
            <div className="card-content">
              <h3>Vendors</h3>
              <p className="card-value">{summary?.vendors ?? '—'}</p>
              <p className="card-label">Approved stores</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">💳</div>
            <div className="card-content">
              <h3>Total Revenue</h3>
              <p className="card-value">₹{Number(summary?.totalSales || 0).toLocaleString('en-IN')}</p>
              <p className="card-label">YTD earnings</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">⚠️</div>
            <div className="card-content">
              <h3>Flagged Items</h3>
              <p className="card-value">{summary?.pendingVendors ?? '—'}</p>
              <p className="card-label">Pending review</p>
            </div>
          </div>
        </section>

        <section className="dashboard-section" id="vendor-queue">
          <div className="section-header">
            <h2>Pending Vendor Applications</h2>
            <span className="section-note">Review and approve onboarding requests</span>
          </div>
          {pendingVendors.length === 0 ? (
            <div className="empty-state">
              <h3>No pending vendors</h3>
              <p>New vendor registrations will appear here for review.</p>
            </div>
          ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Applied Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingVendors.map(vendor => (
                <tr key={vendor.id}>
                  <td>{vendor.name || vendor.store_name}</td>
                  <td>{vendor.user_id}</td>
                  <td>{vendor.description || vendor.store_description || 'General'}</td>
                  <td>{vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-small btn-approve" onClick={() => handleApprove(vendor.id)}>Approve</button>
                      <button className="btn-small btn-reject" onClick={() => handleReject(vendor.id)}>Not Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Approved Vendors</h2>
          <div className="table-like">
            <div className="table-row">
              <span>Rajesh Kumar</span>
              <span>Elite Electronics</span>
              <span>GST-EL-001</span>
              <span className="badge shipped">Approved</span>
            </div>
            <div className="table-row">
              <span>Priya Singh</span>
              <span>Fashion Forward</span>
              <span>GST-FF-002</span>
              <span className="badge pending">Under review</span>
            </div>
          </div>
        </section>

        <section className="dashboard-section" id="platform-health">
          <h2>System Health</h2>
          <div className="health-grid">
            <div className="health-item">
              <p className="health-label">Database</p>
              <p className="health-status healthy">{summary?.dbName ? `✓ ${summary.dbName} (${summary.dbSize || '—'})` : 'Unknown'}</p>
            </div>
            <div className="health-item">
              <p className="health-label">API Server</p>
              <p className="health-status healthy">✓ Healthy</p>
            </div>
            <div className="health-item">
              <p className="health-label">Cache</p>
              <p className="health-status warning">⚠ Warnings</p>
            </div>
            <div className="health-item">
              <p className="health-label">Storage</p>
              <p className="health-status healthy">✓ Healthy</p>
            </div>
          </div>
        </section>
      </main>
    </section>
  )
}
