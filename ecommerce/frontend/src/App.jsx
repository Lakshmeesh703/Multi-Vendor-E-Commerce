import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addToCart, addToWishlist, cleanupCart, createOrder, fetchCart, fetchProducts, fetchWishlist, getAuthToken, getAuthUserId, loginUser, removeFromCart, removeFromWishlist } from './api'
import { adminStats, categories, featuredProducts, vendorHighlights } from './data'
import LoginPage from './pages/LoginPage'
import VendorDashboard from './pages/VendorDashboard'
import DemoVendorLogin from './pages/DemoVendorLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import VendorLogin from './pages/VendorLogin'
import CustomerLogin from './pages/CustomerLogin'
import CustomerDashboard from './pages/CustomerDashboard'
import PasswordResetPage from './pages/PasswordResetPage'

const PRODUCT_CACHE_KEY = 'marketwave_product_cache'

function formatPrice(value) {
  const amount = toINRAmount(value)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function toINRAmount(value) {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getProductCache() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PRODUCT_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function setProductCache(cache) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

function rememberProductSnapshot(product) {
  if (!product || typeof product !== 'object') return
  const productId = product._id || product.id || product.product_mongo_id
  if (!productId) return
  const cache = getProductCache()
  cache[String(productId)] = {
    _id: String(productId),
    title: product.title || 'Product',
    description: product.description || product.subtitle || '',
    subtitle: product.subtitle || product.description || '',
    price: toINRAmount(product.price),
    vendor_id: product.vendor_id || null,
    currency: (product.currency || 'INR').toUpperCase(),
    gradient: product.gradient,
  }
  setProductCache(cache)
}

function getRememberedProduct(productId) {
  if (!productId) return null
  const cache = getProductCache()
  return cache[String(productId)] || null
}

function hydrateCartWithCache(cartData) {
  const items = Array.isArray(cartData?.items) ? cartData.items : []
  return {
    ...cartData,
    items: items.map((item) => {
      const cached = item.product || getRememberedProduct(item.product_mongo_id)
      const fallbackPrice = toINRAmount(cached?.price)
      return {
        ...item,
        unit_price: toINRAmount(item.unit_price ?? fallbackPrice),
        product: cached
          ? {
              ...cached,
              price: toINRAmount(cached.price ?? item.unit_price),
              currency: (cached.currency || 'INR').toUpperCase(),
            }
          : null,
      }
    }),
  }
}

function useMarketplaceFilters(initial = {}) {
  const [filters, setFilters] = useState(initial)
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))
  return { filters, updateFilter, setFilters }
}

function Header({ onMenuToggle, menuOpen }) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')

  const runSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (category && category !== 'all') params.set('category', category)
    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <header className="topbar sticky-top">
      <div className="brand-block">
        <Link className="brand-link" to="/">
          <div className="brand-mark">🏪</div>
          <div>
            <strong>VendorHub</strong>
            <span>Multi-vendor marketplace</span>
          </div>
        </Link>
      </div>

      <button className="mobile-menu-btn" type="button" onClick={onMenuToggle} aria-label="Toggle menu">
        ☰
      </button>

      <div className="search-bar">
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All</option>
          {categories.map(category => <option key={category.name}>{category.name}</option>)}
        </select>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search products, brands and sellers" aria-label="Search" onKeyDown={e => { if (e.key === 'Enter') runSearch() }} />
        <button type="button" onClick={runSearch}>Search</button>
      </div>

      <div className="top-actions">
        {getAuthToken() ? (
          <>
            <Link to="/account">Account</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/wishlist">Wishlist</Link>
          </>
        ) : (
          <>
            <Link to="/customer/login" style={{fontWeight: 'bold', color: '#667eea'}}>Customer Login</Link>
            <Link to="/vendor/login" style={{fontWeight: 'bold', color: '#667eea'}}>Vendor Login</Link>
            <Link to="/admin/login" style={{fontWeight: 'bold', color: '#667eea'}}>Admin Login</Link>
          </>
        )}
      </div>

      <nav className={menuOpen ? 'mega-menu open' : 'mega-menu'}>
        <div className="mega-column mega-highlight">
          <span className="mega-label">Deals</span>
          <h4>Weekend offers</h4>
          <p>Up to 60% off on top vendors, curated for quick browsing.</p>
        </div>
        {categories.map(category => (
          <Link key={category.name} className="mega-item" to={`/products?category=${encodeURIComponent(category.name)}`}>
            <span>{category.icon}</span>
            <strong>{category.name}</strong>
            <small>{category.caption}</small>
          </Link>
        ))}
      </nav>
    </header>
  )
}

function Shell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app-shell">
      <Header onMenuToggle={() => setMenuOpen(open => !open)} menuOpen={menuOpen} />
      <main className="content-wrap">{children}</main>
      <footer className="footer-bar">
        <span>Secure checkout</span>
        <span>Vendor approvals</span>
        <span>Order tracking</span>
        <span>Returns & support</span>
      </footer>
    </div>
  )
}

function ProductCard({ product, onAddCart, onAddWishlist }) {
  return (
    <article className="product-card">
      <div className="product-badge">{product.badge || 'Top Pick'}</div>
      <Link to={`/products/${product._id || product.id}`} className="product-link">
        <div className="product-thumb" style={{ background: product.gradient || 'linear-gradient(135deg,#0f172a,#2563eb)' }} />
        <div className="product-body">
          <div className="product-meta">{product.vendor || 'Marketplace seller'}</div>
          <h3>{product.title}</h3>
          <p>{product.subtitle || product.description}</p>
          <div className="product-footer">
            <strong>{formatPrice(product.price)}</strong>
            <span>{product.rating || 4.6} ★</span>
          </div>
        </div>
      </Link>
      <div className="card-actions">
        <button type="button" className="secondary-btn" onClick={() => onAddWishlist(product)}>Wishlist</button>
        <button type="button" className="primary-btn" onClick={() => onAddCart(product)}>Add to Cart</button>
      </div>
    </article>
  )
}

function MarketHero() {
  return (
    <section className="hero-banner">
      <div>
        <span className="eyebrow">Welcome to VendorHub</span>
        <h1>Professional Multi-vendor Marketplace Platform</h1>
        <p>Browse products from thousands of vendors, manage your store, or handle platform operations - all in one place.</p>
        <div className="hero-actions">
          <Link className="primary-btn" to="/products">Shop Now</Link>
          <Link className="secondary-btn" to="/vendor/login">Start Selling</Link>
        </div>
      </div>
      <div className="hero-card">
        <div className="hero-stat"><strong>1.2M+</strong><span>products</span></div>
        <div className="hero-stat"><strong>8K</strong><span>vendors</span></div>
        <div className="hero-stat"><strong>99.9%</strong><span>uptime</span></div>
      </div>
    </section>
  )
}

function Homepage() {
  return (
    <div className="home-layout">
      <MarketHero />
      <section className="market-strip">
        {categories.map(item => <div key={item.name} className="chip-card"><span>{item.icon}</span><strong>{item.name}</strong><p>{item.caption}</p></div>)}
      </section>
      <ListingPreview />
    </div>
  )
}

function ListingPreview() {
  const navigate = useNavigate()
  const { filters, updateFilter, setFilters } = useMarketplaceFilters({ sort: 'featured' })
  const [products, setProducts] = useState(featuredProducts)
  const [loading, setLoading] = useState(false)

  const resolveProductId = (value) => {
    if (typeof value === 'object' && value !== null) {
      return value._id || value.id || value.product_mongo_id || value.productId
    }
    return value
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchProducts(filters).then(data => {
      if (!mounted) return
      setProducts(data.length ? data : featuredProducts)
    }).catch(() => {
      if (mounted) setProducts(featuredProducts)
    }).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [filters])

  const handleAddCart = async (productOrId) => {
    const productId = resolveProductId(productOrId)
    if (!productId) return
    try {
      let snapshot = null
      if (typeof productOrId === 'object' && productOrId !== null) {
        rememberProductSnapshot(productOrId)
        snapshot = {
          product_mongo_id: String(productId),
          title: productOrId.title || 'Product',
          description: productOrId.description || productOrId.subtitle || '',
          price: toINRAmount(productOrId.price),
          currency: (productOrId.currency || 'INR').toUpperCase(),
          vendor_id: productOrId.vendor_id || null,
          images: productOrId.images || [],
        }
      }
      await addToCart(productId, 1, snapshot)
      // Small delay to ensure backend has saved the item
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/cart')
    } catch (e) {
      alert(`Unable to add item to cart: ${e?.message || 'Unknown error'}`)
    }
  }

  const handleAddWishlist = async (productOrId) => {
    if (!getAuthToken()) {
      alert('Please log in to add items to your wishlist')
      navigate('/customer/login')
      return
    }
    const productId = resolveProductId(productOrId)
    if (!productId) return
    await addToWishlist(productId)
    navigate('/wishlist')
  }

  return (
    <section className="listing-layout">
      <div className="listing-toolbar panel-card">
        <div>
          <span className="eyebrow">Trending now</span>
          <h2>Fast-moving offers, curated categories, and vendor-backed deals.</h2>
        </div>
        <div className="filters-row">
          <select value={filters.category || ''} onChange={e => updateFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map(category => <option key={category.name}>{category.name}</option>)}
          </select>
          <select value={filters.sort || 'featured'} onChange={e => updateFilter('sort', e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price_low">Price low to high</option>
            <option value="price_high">Price high to low</option>
          </select>
          <input type="number" placeholder="Min rating" min="0" max="5" step="0.1" value={filters.min_rating || ''} onChange={e => updateFilter('min_rating', e.target.value)} />
          <button type="button" className="secondary-btn" onClick={() => setFilters({ sort: 'featured' })}>Reset</button>
        </div>
      </div>

      {loading ? <div className="panel-card">Loading products...</div> : null}

      <div className="market-grid">
        {products.map(product => (
          <ProductCard key={product._id || product.id} product={product} onAddCart={handleAddCart} onAddWishlist={handleAddWishlist} />
        ))}
      </div>
    </section>
  )
}

function ProductsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const params = useMemo(() => ({
    category: searchParams.get('category') || '',
    q: searchParams.get('q') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    min_rating: searchParams.get('min_rating') || '',
    sort: searchParams.get('sort') || 'featured',
  }), [searchParams])
  const [products, setProducts] = useState([])
  const [wishlistIds, setWishlistIds] = useState(new Set())

  useEffect(() => {
    fetchProducts(params).then(setProducts).catch(() => setProducts(featuredProducts))
  }, [params])

  useEffect(() => {
    fetchWishlist().then(data => setWishlistIds(new Set(data.items.map(item => String(item.product_mongo_id))))).catch(() => setWishlistIds(new Set()))
  }, [])

  const resolveProductId = (value) => {
    if (typeof value === 'object' && value !== null) {
      return value._id || value.id || value.product_mongo_id || value.productId
    }
    return value
  }

  const handleAddCart = async (productOrId) => {
    const productId = resolveProductId(productOrId)
    if (!productId) return
    try {
      await addToCart(productId, 1)
      // Small delay to ensure backend has saved the item
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/cart')
    } catch (e) {
      alert(`Unable to add item to cart: ${e?.message || 'Unknown error'}`)
    }
  }

  const handleToggleWishlist = async (productOrId) => {
    if (!getAuthToken()) {
      alert('Please log in to add items to your wishlist')
      navigate('/customer/login')
      return
    }
    const productId = resolveProductId(productOrId)
    if (!productId) return
    if (wishlistIds.has(String(productId))) {
      await removeFromWishlist(productId)
      setWishlistIds(prev => {
        const next = new Set(prev)
        next.delete(String(productId))
        return next
      })
    } else {
      await addToWishlist(productId)
      setWishlistIds(prev => new Set(prev).add(String(productId)))
    }
  }

  return (
    <div className="listing-layout">
      <div className="panel-card listing-header">
        <div>
          <span className="eyebrow">Search results</span>
          <h2>Browse filtered catalog</h2>
          <p className="muted">Showing products for the current category and price/rating filters.</p>
        </div>
        <div className="pill-list">
          {params.category ? <span>{params.category}</span> : <span>All categories</span>}
          {params.q ? <span>Search: {params.q}</span> : null}
        </div>
      </div>
      <div className="market-grid">
        {products.map(product => (
          <ProductCard
            key={product._id || product.id}
            product={product}
            onAddCart={handleAddCart}
            onAddWishlist={handleToggleWishlist}
          />
        ))}
      </div>
    </div>
  )
}

function ProductDetailPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts({}).then(items => {
      const found = items.find(item => String(item._id || item.id) === String(productId)) || featuredProducts[0]
      setProduct(found)
    }).catch(() => setProduct(featuredProducts[0]))
  }, [productId])

  if (!product) return <div className="panel-card">Loading product...</div>

  return (
    <section className="page-grid detail-grid">
      <div className="gallery-card">
        <div className="hero-image" style={{ background: product.gradient }} />
        <div className="mini-rail">
          <span>Free delivery</span>
          <span>Top rated</span>
          <span>7 day returns</span>
        </div>
      </div>
      <div className="panel-card">
        <div className="eyebrow">{product.vendor || 'Marketplace seller'}</div>
        <h2>{product.title}</h2>
        <p className="muted">{product.subtitle || product.description}</p>
        <div className="price-line">
          <strong>{formatPrice(product.price)}</strong>
          <span>{product.rating || 4.7} ★ ({product.reviews || 0} reviews)</span>
        </div>
        <div className="spec-grid">
          {(product.specs || ['Fast delivery', 'Quality assured', 'Easy returns']).map(spec => <span key={spec}>{spec}</span>)}
        </div>
        <div className="action-row">
          <button
            className="primary-btn"
            onClick={async () => {
              if (!getAuthToken()) {
                alert('Please log in to add items to your cart')
                navigate('/customer/login')
                return
              }
              const resolvedId = product._id || product.id || productId
              if (!resolvedId) return
              try {
                rememberProductSnapshot(product)
                const snapshot = {
                  product_mongo_id: String(resolvedId),
                  title: product.title || 'Product',
                  description: product.description || product.subtitle || '',
                  price: toINRAmount(product.price),
                  currency: (product.currency || 'INR').toUpperCase(),
                  vendor_id: product.vendor_id || null,
                  images: product.images || [],
                }
                await addToCart(resolvedId, 1, snapshot)
                // Small delay to ensure backend has saved the item
                await new Promise(resolve => setTimeout(resolve, 500))
                navigate('/cart')
              } catch (e) {
                alert(`Unable to add item to cart: ${e?.message || 'Unknown error'}`)
              }
            }}
          >
            Add to Cart
          </button>
          <button
            className="secondary-btn"
            onClick={async () => {
              if (!getAuthToken()) {
                alert('Please log in to add items to your wishlist')
                navigate('/customer/login')
                return
              }
              const resolvedId = product._id || product.id || productId
              if (!resolvedId) return
              await addToWishlist(resolvedId)
              navigate('/wishlist')
            }}
          >
            Wishlist
          </button>
        </div>
      </div>
    </section>
  )
}

function CartPage() {
  const [cart, setCart] = useState({ items: [] })
  const navigate = useNavigate()

  const refreshHydrated = async () => {
    try {
      const data = await fetchCart()
      const hydrated = hydrateCartWithCache(data)
      setCart(hydrated)
    } catch (err) {
      console.error('Failed to fetch cart:', err)
      setCart({ items: [] })
    }
  }

  useEffect(() => {
    refreshHydrated()
    // Also refetch after a short delay to catch any race conditions
    const timer = setTimeout(refreshHydrated, 500)
    return () => clearTimeout(timer)
  }, [])

  const subtotal = cart.items.reduce((sum, item) => {
    const unitPrice = toINRAmount(item.product?.price ?? item.unit_price)
    return sum + (unitPrice * item.quantity)
  }, 0)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <section className="page-grid cart-grid">
      <div className="panel-card">
        <h2>Shopping Cart</h2>
        {cart.items.length === 0 ? <p className="muted">Your cart is empty.</p> : null}
        {cart.items.map(item => (
          <div key={item.product_mongo_id} className="cart-item">
            <div className="cart-thumb" style={{ background: item.product?.gradient || 'linear-gradient(135deg,#0f172a,#2563eb)' }} />
            <div>
              <strong>{item.product?.title || 'Product'}</strong>
              <p>{item.product?.subtitle || item.product?.description}</p>
            </div>
            <div className="cart-item-actions">
              <div>{formatPrice(item.product?.price ?? item.unit_price)}</div>
              <button className="ghost-btn" type="button" onClick={async () => { await removeFromCart(item.product_mongo_id); refreshHydrated() }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <aside className="panel-card summary-card">
        <h3>Order Summary</h3>
        <p>Items: {itemCount}</p>
        <p>Delivery: Free</p>
        <strong>Total: {formatPrice(subtotal)}</strong>
        <button className="primary-btn wide" onClick={() => navigate('/checkout')}>Proceed to Checkout</button>
        <button className="secondary-btn wide" onClick={async () => { await cleanupCart(); refreshHydrated() }}>Reset quantities</button>
      </aside>
    </section>
  )
}

function CheckoutPage() {
  const navigate = useNavigate()
  const token = getAuthToken()
  const [cart, setCart] = useState({ items: [] })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    if (!token) {
      alert('Please log in to place an order')
      navigate('/customer/login')
      return
    }
    fetchCart().then((data) => setCart(hydrateCartWithCache(data))).catch(() => setCart({ items: [] }))
  }, [token, navigate])

  const subtotal = cart.items.reduce((sum, item) => {
    const unitPrice = toINRAmount(item.product?.price ?? item.unit_price)
    return sum + (unitPrice * item.quantity)
  }, 0)

  const handlePay = async () => {
    if (!name || !phone || !address) {
      alert('Please fill name, phone, and address')
      return
    }
    const userId = getAuthUserId()
    if (!userId) {
      alert('Please sign in to place an order.')
      navigate('/customer/login')
      return
    }
    setLoading(true)
    try {
      const payload = {
        user_id: userId,
        shipping_address: { name, phone, address, city, pincode },
        items: cart.items.map(i => ({
          product_mongo_id: i.product_mongo_id,
          quantity: i.quantity,
          vendor_id: i.product?.vendor_id || i.vendor_id,
          unit_price: toINRAmount(i.product?.price ?? i.unit_price),
          product_snapshot: i.product
            ? {
                product_mongo_id: i.product_mongo_id,
                title: i.product.title || 'Product',
                description: i.product.description || '',
                category: i.product.category || '',
                vendor_id: i.product.vendor_id || i.vendor_id || null,
                currency: i.product.currency || 'INR',
                price: toINRAmount(i.product.price ?? i.unit_price),
              }
            : null,
        })),
        currency: 'INR',
        payment_method: 'credit_card'
      }
      const res = await createOrder(payload)
      alert('Order placed: ' + JSON.stringify(res))
      navigate('/')
    } catch (e) {
      console.error(e)
      alert('Order failed: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-grid checkout-grid">
      <div className="panel-card">
        <h2>Checkout</h2>
        <div className="checkout-form">
          <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
          <input placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
          <div className="split">
            <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
            <input placeholder="Pincode" value={pincode} onChange={e => setPincode(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="panel-card">
        <h3>Payment</h3>
        <div className="summary-row">
          <p>Items: {cart.items.length}</p>
          <p>Delivery: Free</p>
          <strong>Total: {formatPrice(subtotal)}</strong>
        </div>
        <button className="primary-btn wide" onClick={handlePay} disabled={loading}>{loading ? 'Processing...' : 'Pay Securely'}</button>
        <p className="muted">ACID-safe order flow with outbox + webhook confirmation.</p>
      </div>
    </section>
  )
}

function WishlistPage() {
  const [wishlist, setWishlist] = useState({ items: [] })

  const refresh = () => fetchWishlist().then(setWishlist).catch(() => setWishlist({ items: [] }))

  useEffect(() => {
    refresh()
  }, [])

  return (
    <section className="page-grid dashboard-grid">
      <div className="panel-card">
        <h2>Wishlist</h2>
        {wishlist.items.length === 0 ? <p className="muted">Your wishlist is empty.</p> : null}
        <div className="table-like">
          {wishlist.items.map(item => (
            <div key={item.product_mongo_id} className="table-row wishlist-row">
              <span>{item.product?.title || item.product_mongo_id}</span>
              <span>{formatPrice(item.product?.price ?? item.unit_price)}</span>
              <button className="ghost-btn" type="button" onClick={async () => { await removeFromWishlist(item.product_mongo_id); refresh() }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function VendorDashboardPage() {
  return (
    <section className="page-grid dashboard-grid">
      <div className="panel-card stats-strip">
        {vendorHighlights.map(item => <div key={item.label} className="stat-box"><strong>{item.value}</strong><span>{item.label}</span></div>)}
      </div>
      <div className="panel-card">
        <h2>Vendor Dashboard</h2>
        <div className="table-like">
          {featuredProducts.map(product => <div key={product.id} className="table-row"><span>{product.title}</span><span>{product.price}</span><span>{product.stock} in stock</span></div>)}
        </div>
      </div>
    </section>
  )
}

function AdminPanelPage() {
  return (
    <section className="page-grid dashboard-grid">
      <div className="panel-card stats-strip">
        {adminStats.map(item => <div key={item.label} className="stat-box"><strong>{item.value}</strong><span>{item.label}</span></div>)}
      </div>
      <div className="panel-card">
        <h2>Admin Panel</h2>
        <div className="pill-list">
          <span>Vendor approval</span>
          <span>Commission control</span>
          <span>Dispute resolution</span>
          <span>Catalog moderation</span>
        </div>
      </div>
    </section>
  )
}

function AccountPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const token = getAuthToken()

  const handleLogin = async () => {
    setStatus('')
    try {
      const res = await loginUser(email, password)
      setStatus(`Signed in as ${res?.user?.email || email}`)
    } catch (err) {
      setStatus(err.message || 'Login failed')
    }
  }

  return (
    <section className="panel-card">
      <h2>Account</h2>
      <p className="muted">Login and vendor onboarding flows are available through the backend auth routes.</p>
      <div className="auth-grid">
        <div className="auth-card">
          <h3>Customer Login</h3>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="primary-btn wide" onClick={handleLogin}>Sign in</button>
          {token ? <p className="muted">Signed in</p> : null}
          {status ? <p className="muted">{status}</p> : null}
        </div>
        <div className="auth-card">
          <h3>Vendor Request</h3>
          <input placeholder="Store name" />
          <input placeholder="City" />
          <button className="secondary-btn wide">Request access</button>
        </div>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <div className="panel-card">
      <h2>Page not found</h2>
      <p className="muted">The route you requested does not exist.</p>
      <Link className="primary-btn inline-btn" to="/">Back to home</Link>
    </div>
  )
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Navigate to="/customer/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/demo-login/vendor" element={<DemoVendorLogin />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/shop" element={<Shell><Homepage /></Shell>} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="*" element={
          <Shell>
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/vendor" element={<Navigate to="/vendor-dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Shell>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
