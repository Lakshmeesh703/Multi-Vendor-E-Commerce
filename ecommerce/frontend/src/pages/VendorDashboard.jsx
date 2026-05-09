import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createVendorProduct,
  deleteVendorProduct,
  fetchVendorAnalytics,
  fetchVendorOrders,
  fetchVendorProducts,
  fetchVendorSummary,
  getAuthUserId,
  updateVendorProduct,
} from '../api'
import '../styles/DashboardPages.css'

const DUMMY_PRODUCTS = [
  {
    _id: 'demo-product-1',
    title: 'Demo Wireless Headphones',
    category: 'electronics',
    price: 2499,
    inventory: { sku: 'DEMO-HP-001', quantity: 42 },
    __demo: true,
  },
  {
    _id: 'demo-product-2',
    title: 'Demo Smartwatch',
    category: 'electronics',
    price: 3999,
    inventory: { sku: 'DEMO-SW-010', quantity: 18 },
    __demo: true,
  },
  {
    _id: 'demo-product-3',
    title: 'Demo Backpack (Waterproof)',
    category: 'fashion',
    price: 1199,
    inventory: { sku: 'DEMO-BP-220', quantity: 8 },
    __demo: true,
  },
]

const DUMMY_ORDERS = [
  {
    order_id: 'DEMO-1001',
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    total_amount: 4998,
    items: [
      { title: 'Demo Wireless Headphones', quantity: 2, unit_price: 2499, line_total: 4998 },
    ],
    __demo: true,
  },
  {
    order_id: 'DEMO-1002',
    status: 'paid',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    total_amount: 3999,
    items: [
      { title: 'Demo Smartwatch', quantity: 1, unit_price: 3999, line_total: 3999 },
    ],
    __demo: true,
  },
]

export default function VendorDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const [catalogError, setCatalogError] = useState('')
  const [catalogBusy, setCatalogBusy] = useState(false)
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: '',
    price: '',
    description: '',
    sku: '',
    quantity: '',
  })
  const [editing, setEditing] = useState({})

  useEffect(() => {
    const userId = getAuthUserId('vendor')
    setUser({ id: userId, name: 'Tech Vendor' })
  }, [])

  useEffect(() => {
    fetchVendorSummary().then(setSummary).catch(() => setSummary(null))
    fetchVendorProducts()
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setProducts(list.length ? list : DUMMY_PRODUCTS)
      })
      .catch(() => setProducts(DUMMY_PRODUCTS))
    fetchVendorOrders()
      .then((data) => {
        const list = Array.isArray(data?.orders) ? data.orders : []
        setOrders(list.length ? list : DUMMY_ORDERS)
      })
      .catch(() => setOrders(DUMMY_ORDERS))
    fetchVendorAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
  }, [])

  const quickActions = useMemo(() => ([
    { label: 'Add a new product', description: 'Create a fresh catalog listing', onClick: () => setActiveTab('catalog') },
    { label: 'Review orders', description: 'See your latest vendor orders', onClick: () => setActiveTab('orders') },
    { label: 'Open analytics', description: 'Track revenue and top products', onClick: () => setActiveTab('analytics') },
    { label: 'Account & login', description: 'Manage your vendor account access', onClick: () => navigate('/vendor/login') },
  ]), [navigate])

  const recentOrders = orders.slice(0, 5)
  const inventoryPreview = products.slice(0, 5)

  const refreshVendorData = async () => {
    const [nextSummary, nextProducts, nextOrders, nextAnalytics] = await Promise.all([
      fetchVendorSummary().catch(() => null),
      fetchVendorProducts().catch(() => []),
      fetchVendorOrders().then((data) => (Array.isArray(data?.orders) ? data.orders : [])).catch(() => []),
      fetchVendorAnalytics().catch(() => null),
    ])
    setSummary(nextSummary)
    const resolvedProducts = Array.isArray(nextProducts) ? nextProducts : []
    const resolvedOrders = Array.isArray(nextOrders) ? nextOrders : []
    setProducts(resolvedProducts.length ? resolvedProducts : DUMMY_PRODUCTS)
    setOrders(resolvedOrders.length ? resolvedOrders : DUMMY_ORDERS)
    setAnalytics(nextAnalytics)
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setCatalogError('')
    setCatalogBusy(true)
    try {
      const payload = {
        title: newProduct.title,
        category: newProduct.category,
        description: newProduct.description,
        price: Number(newProduct.price),
        images: [],
        inventory: {
          sku: newProduct.sku,
          quantity: Number(newProduct.quantity || 0),
        },
      }
      await createVendorProduct(payload)
      setNewProduct({ title: '', category: '', price: '', description: '', sku: '', quantity: '' })
      await refreshVendorData()
    } catch (err) {
      setCatalogError(err.message || 'Failed to create product')
    } finally {
      setCatalogBusy(false)
    }
  }

  const beginEdit = (product) => {
    if (product?.__demo) return
    setEditing((prev) => ({
      ...prev,
      [product._id]: {
        title: product.title || '',
        category: product.category || '',
        price: String(product.price ?? ''),
        sku: product.inventory?.sku || '',
        quantity: String(product.inventory?.quantity ?? ''),
      },
    }))
  }

  const cancelEdit = (productId) => {
    setEditing((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const saveEdit = async (productId) => {
    setCatalogError('')
    setCatalogBusy(true)
    try {
      const draft = editing[productId]
      await updateVendorProduct(productId, {
        title: draft.title,
        category: draft.category,
        price: Number(draft.price),
        inventory: {
          sku: draft.sku,
          quantity: Number(draft.quantity || 0),
        },
      })
      cancelEdit(productId)
      await refreshVendorData()
    } catch (err) {
      setCatalogError(err.message || 'Failed to update product')
    } finally {
      setCatalogBusy(false)
    }
  }

  const removeProduct = async (productId) => {
    if (String(productId || '').startsWith('demo-')) return
    setCatalogError('')
    setCatalogBusy(true)
    try {
      await deleteVendorProduct(productId)
      await refreshVendorData()
    } catch (err) {
      setCatalogError(err.message || 'Failed to delete product')
    } finally {
      setCatalogBusy(false)
    }
  }

  return (
    <section className="dashboard-layout vendor-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>🏬 Vendor Portal</h2>
          <p className="sidebar-subtitle">Manage products, orders and revenue</p>
        </div>
        <nav className="sidebar-menu">
          <button type="button" className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={`menu-item ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>Catalog</button>
          <button type="button" className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>Orders</button>
          <button type="button" className={`menu-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
          <button type="button" className="menu-item" onClick={() => navigate('/vendor/login')}>Account</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-hero panel-card">
          <div>
            <span className="eyebrow">Vendor account</span>
            <h1>Welcome, {user?.name || 'Vendor'}</h1>
            <p className="header-subtitle">Track the store, check sales and keep inventory moving without leaving the dashboard.</p>
          </div>
          <div className="hero-chip-row">
            <span>{summary?.products ?? products.length ?? 0} products</span>
            <span>{summary?.orders ?? analytics?.orders ?? orders.length ?? 0} orders</span>
            <span>₹{Number(summary?.revenue ?? analytics?.revenue ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </header>

        {activeTab === 'overview' && (
          <>
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Quick Actions</h2>
                <button type="button" className="ghost-link" onClick={refreshVendorData}>Refresh</button>
              </div>
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
                <div className="card-icon">📦</div>
                <div className="card-content">
                  <h3>Total Products</h3>
                  <p className="card-value">{summary?.products ?? analytics?.products ?? products.length ?? '—'}</p>
                  <p className="card-label">Active listings</p>
                </div>
              </div>
              <div className="card">
                <div className="card-icon">📥</div>
                <div className="card-content">
                  <h3>Orders</h3>
                  <p className="card-value">{analytics?.orders ?? summary?.orders ?? orders.length ?? '—'}</p>
                  <p className="card-label">Vendor order count</p>
                </div>
              </div>
              <div className="card">
                <div className="card-icon">💰</div>
                <div className="card-content">
                  <h3>Revenue</h3>
                  <p className="card-value">₹{Number(analytics?.revenue ?? summary?.revenue ?? 0).toLocaleString('en-IN')}</p>
                  <p className="card-label">All-time vendor revenue</p>
                </div>
              </div>
              <div className="card">
                <div className="card-icon">🧾</div>
                <div className="card-content">
                  <h3>Low Stock</h3>
                  <p className="card-value">{summary?.lowStock ?? analytics?.lowStock ?? '—'}</p>
                  <p className="card-label">Items at ≤ 10 units</p>
                </div>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <h2>Recent Orders</h2>
                <button type="button" className="ghost-link" onClick={() => setActiveTab('orders')}>Open orders</button>
              </div>
              {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <h3>No recent orders</h3>
                  <p>Orders will show here once customers begin buying from your listings.</p>
                </div>
              ) : (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.order_id}>
                        <td>#{order.order_id}</td>
                        <td>{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</td>
                        <td>{Array.isArray(order.items) ? order.items.length : 0}</td>
                        <td>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
                        <td><span className="badge pending">{order.status || 'pending'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <h2>Inventory Snapshot</h2>
                <button type="button" className="ghost-link" onClick={() => setActiveTab('catalog')}>Manage catalog</button>
              </div>
              {inventoryPreview.length === 0 ? (
                <div className="empty-state">
                  <h3>No products yet</h3>
                  <p>Add your first item in the Catalog tab.</p>
                </div>
              ) : (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryPreview.map(product => (
                      <tr key={product._id}>
                        <td>{product.title}</td>
                        <td>{product.inventory?.sku || '—'}</td>
                        <td>{product.inventory?.quantity ?? '—'}</td>
                        <td>
                          <span className={Number(product.inventory?.quantity ?? 0) <= 10 ? 'badge pending' : 'badge shipped'}>
                            {Number(product.inventory?.quantity ?? 0) <= 10 ? 'Low stock' : 'In stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {activeTab === 'catalog' && (
          <>
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Catalog</h2>
                <button type="button" className="ghost-link" onClick={refreshVendorData}>Refresh</button>
              </div>
              <p className="section-note">Add and maintain your product listings. Cart/Wishlist actions are customer-only.</p>
              {products.some((p) => p?.__demo) && (
                <p className="section-note" style={{ marginTop: -8 }}>
                  Showing sample data (connect backend + create products to replace this).
                </p>
              )}

              <div className="panel-card" style={{ marginTop: 12, padding: 18, borderRadius: 16, background: 'rgba(255, 255, 255, 0.78)' }}>
                <h3 style={{ marginTop: 0 }}>Add Product</h3>
                <form onSubmit={handleCreateProduct} className="portal-form" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label htmlFor="vendor-title">Title</label>
                    <input
                      id="vendor-title"
                      value={newProduct.title}
                      onChange={(e) => setNewProduct((p) => ({ ...p, title: e.target.value }))}
                      required
                      placeholder="Product title"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendor-category">Category</label>
                    <input
                      id="vendor-category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                      placeholder="e.g. electronics"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendor-price">Price (INR)</label>
                    <input
                      id="vendor-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                      required
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendor-sku">SKU</label>
                    <input
                      id="vendor-sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                      placeholder="Required for inventory tracking"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendor-quantity">Stock Quantity</label>
                    <input
                      id="vendor-quantity"
                      type="number"
                      min="0"
                      step="1"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendor-description">Description</label>
                    <input
                      id="vendor-description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the product for customers"
                    />
                  </div>

                  {catalogError && <div className="portal-error">❌ {catalogError}</div>}

                  <button type="submit" className="portal-primary-btn" disabled={catalogBusy}>
                    {catalogBusy ? 'Saving...' : 'Add to Catalog'}
                  </button>
                </form>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <h2>Your Products</h2>
                <span className="section-note">{products.length} items</span>
              </div>
              {products.length === 0 ? (
                <div className="empty-state">
                  <h3>No products in your catalog</h3>
                  <p>Add your first item using the form above.</p>
                </div>
              ) : (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const draft = editing[product._id]
                      const isEditing = Boolean(draft)
                      return (
                        <tr key={product._id}>
                          <td>
                            {isEditing ? (
                              <input
                                value={draft.title}
                                onChange={(e) => setEditing((prev) => ({ ...prev, [product._id]: { ...prev[product._id], title: e.target.value } }))}
                              />
                            ) : (
                              product.title
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                value={draft.category}
                                onChange={(e) => setEditing((prev) => ({ ...prev, [product._id]: { ...prev[product._id], category: e.target.value } }))}
                              />
                            ) : (
                              product.category || '—'
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.price}
                                onChange={(e) => setEditing((prev) => ({ ...prev, [product._id]: { ...prev[product._id], price: e.target.value } }))}
                              />
                            ) : (
                              `₹${Number(product.price || 0).toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.quantity}
                                onChange={(e) => setEditing((prev) => ({ ...prev, [product._id]: { ...prev[product._id], quantity: e.target.value } }))}
                              />
                            ) : (
                              product.inventory?.quantity ?? 0
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <>
                                <button className="btn-small" type="button" disabled={catalogBusy} onClick={() => saveEdit(product._id)}>Save</button>{' '}
                                <button className="btn-small" type="button" disabled={catalogBusy} onClick={() => cancelEdit(product._id)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn-small" type="button" disabled={catalogBusy} onClick={() => beginEdit(product)}>Edit</button>{' '}
                                <button className="btn-small" type="button" disabled={catalogBusy} onClick={() => removeProduct(product._id)}>Delete</button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {activeTab === 'orders' && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Orders</h2>
              <button type="button" className="ghost-link" onClick={refreshVendorData}>Refresh</button>
            </div>
            {orders.some((o) => o?.__demo) && (
              <p className="section-note">Showing sample orders (real orders will replace this).</p>
            )}
            {orders.length === 0 ? (
              <div className="empty-state">
                <h3>No vendor orders yet</h3>
                <p>When customers purchase your products, orders will appear here.</p>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id}>
                      <td>#{order.order_id}</td>
                      <td>{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</td>
                      <td><span className="badge pending">{order.status || 'pending'}</span></td>
                      <td>
                        {Array.isArray(order.items) && order.items.length > 0
                          ? `${order.items.length} item(s) — ${order.items[0]?.title || 'Product'}${order.items.length > 1 ? ' + more' : ''}`
                          : '—'}
                      </td>
                      <td>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <>
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Analytics</h2>
                <button type="button" className="ghost-link" onClick={refreshVendorData}>Refresh</button>
              </div>
              {!analytics ? (
                <div className="empty-state">
                  <h3>Analytics unavailable</h3>
                  <p>Once orders exist, analytics will show revenue and top products.</p>
                </div>
              ) : (
                <>
                  <section className="dashboard-cards">
                    <div className="card">
                      <div className="card-icon">💰</div>
                      <div className="card-content">
                        <h3>Total Revenue</h3>
                        <p className="card-value">₹{Number(analytics.revenue || 0).toLocaleString('en-IN')}</p>
                        <p className="card-label">Vendor sales</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-icon">🧾</div>
                      <div className="card-content">
                        <h3>Total Orders</h3>
                        <p className="card-value">{analytics.orders ?? 0}</p>
                        <p className="card-label">Distinct orders</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-icon">📦</div>
                      <div className="card-content">
                        <h3>Units Sold</h3>
                        <p className="card-value">{analytics.units ?? 0}</p>
                        <p className="card-label">Total quantity</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-icon">📈</div>
                      <div className="card-content">
                        <h3>Avg Order Value</h3>
                        <p className="card-value">₹{Number(analytics.avgOrderValue || 0).toLocaleString('en-IN')}</p>
                        <p className="card-label">Revenue ÷ orders</p>
                      </div>
                    </div>
                  </section>

                  <section className="dashboard-section">
                    <div className="section-header">
                      <h2>Revenue (Last 14 Days)</h2>
                      <span className="section-note">Daily totals</span>
                    </div>
                    {Array.isArray(analytics.revenueByDay) && analytics.revenueByDay.length > 0 ? (
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.revenueByDay.map((row) => (
                            <tr key={String(row.day)}>
                              <td>{row.day ? new Date(row.day).toLocaleDateString() : '—'}</td>
                              <td>{row.orders ?? 0}</td>
                              <td>₹{Number(row.revenue || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state">
                        <h3>No recent revenue</h3>
                        <p>Daily revenue will populate once orders are placed.</p>
                      </div>
                    )}
                  </section>

                  <section className="dashboard-section">
                    <div className="section-header">
                      <h2>Top Products</h2>
                      <span className="section-note">By revenue</span>
                    </div>
                    {Array.isArray(analytics.topProducts) && analytics.topProducts.length > 0 ? (
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Units</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topProducts.map((row) => (
                            <tr key={row.product_mongo_id}>
                              <td>{row.title || row.product_mongo_id}</td>
                              <td>{row.units ?? 0}</td>
                              <td>₹{Number(row.revenue || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state">
                        <h3>No product analytics yet</h3>
                        <p>Top products appear after sales begin.</p>
                      </div>
                    )}
                  </section>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </section>
  )
}
