const API_BASE = ''
const AUTH_TOKEN_KEY = 'marketwave_auth_token'
const AUTH_TOKEN_KEYS = {
  default: AUTH_TOKEN_KEY,
  admin: 'marketwave_auth_token_admin',
  vendor: 'marketwave_auth_token_vendor',
  customer: 'marketwave_auth_token_customer',
}

function getToken(key) {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const value = `${key}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(key, value)
  return value
}

function getAuthToken(role = 'default') {
  if (typeof window === 'undefined') return ''
  const key = AUTH_TOKEN_KEYS[role] || AUTH_TOKEN_KEYS.default
  if (role !== 'default') {
    return window.localStorage.getItem(key) || ''
  }
  return (
    window.localStorage.getItem(AUTH_TOKEN_KEYS.default) ||
    window.localStorage.getItem(AUTH_TOKEN_KEYS.vendor) ||
    window.localStorage.getItem(AUTH_TOKEN_KEYS.admin) ||
    window.localStorage.getItem(AUTH_TOKEN_KEYS.customer) ||
    ''
  )
}

function setAuthToken(token, role = 'default') {
  if (typeof window === 'undefined') return
  const key = AUTH_TOKEN_KEYS[role] || AUTH_TOKEN_KEYS.default
  if (!token) {
    window.localStorage.removeItem(key)
    return
  }
  if (key !== AUTH_TOKEN_KEYS.default) {
    window.localStorage.removeItem(AUTH_TOKEN_KEYS.default)
  }
  window.localStorage.setItem(key, token)
}

function getAuthUserId(role = 'default') {
  const token = getAuthToken(role)
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.id || null
  } catch {
    return null
  }
}

async function rawRequest(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

async function request(path, options = {}, retryOn401 = true, authRole = 'default') {
  const response = await rawRequest(path, options)
  if (!response.ok) {
    if (response.status === 401 && retryOn401 && path !== '/api/auth/refresh') {
      const refreshed = await refreshAuthToken(authRole)
      if (refreshed) {
        const retryResponse = await rawRequest(path, options)
        if (retryResponse.ok) return retryResponse.json()
        const retryError = await retryResponse.text()
        throw new Error(retryError || retryResponse.statusText)
      }
    }
    const error = await response.text()
    throw new Error(error || response.statusText)
  }
  return response.json()
}

async function authenticatedRequest(path, options = {}, role = 'default') {
  const token = getAuthToken(role)
  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }, true, role)
}

export async function refreshAuthToken(role = 'default') {
  try {
    const response = await rawRequest('/api/auth/refresh', { method: 'POST' }, false)
    if (!response.ok) return null
    const data = await response.json()
    if (data?.token) {
      setAuthToken(data.token, role)
      return data.token
    }
    return null
  } catch {
    return null
  }
}

export async function fetchProducts(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  return request(`/api/products${params.toString() ? `?${params.toString()}` : ''}`)
}

export async function fetchCart() {
  const cartToken = getToken('marketwave_cart_token')
  return request('/api/cart', { headers: { 'x-cart-token': cartToken } })
}

export async function addToCart(productId, quantity = 1, productSnapshot = null) {
  const cartToken = getToken('marketwave_cart_token')
  return request('/api/cart/items', {
    method: 'POST',
    headers: { 'x-cart-token': cartToken },
    body: JSON.stringify({
      product_mongo_id: productId,
      quantity,
      product_snapshot: productSnapshot,
    }),
  })
}

export async function removeFromCart(productId) {
  const cartToken = getToken('marketwave_cart_token')
  return request(`/api/cart/items/${productId}`, {
    method: 'DELETE',
    headers: { 'x-cart-token': cartToken },
  })
}

export async function cleanupCart() {
  const cartToken = getToken('marketwave_cart_token')
  return request('/api/cart/cleanup', {
    method: 'POST',
    headers: { 'x-cart-token': cartToken },
  })
}

export async function fetchWishlist() {
  const wishlistToken = getToken('marketwave_wishlist_token')
  return request('/api/wishlist', { headers: { 'x-wishlist-token': wishlistToken } })
}

export async function fetchAdminSummary() {
  return authenticatedRequest('/api/admin/summary')
}

export async function fetchAdminPendingVendors() {
  return authenticatedRequest('/api/admin/vendors/pending')
}

export async function approveVendor(vendorId) {
  return authenticatedRequest(`/api/admin/vendors/${vendorId}/approve`, { method: 'POST' })
}

export async function rejectVendor(vendorId) {
  return authenticatedRequest(`/api/admin/vendors/${vendorId}/reject`, { method: 'POST' })
}

export async function fetchVendorSummary() {
  return authenticatedRequest('/api/vendor/summary')
}

export async function fetchVendorProducts() {
  return authenticatedRequest('/api/vendor/products')
}

export async function fetchVendorOrders() {
  return authenticatedRequest('/api/vendor/orders')
}

export async function fetchVendorAnalytics() {
  return authenticatedRequest('/api/vendor/analytics')
}

export async function createVendorProduct(payload) {
  return authenticatedRequest('/api/vendor/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateVendorProduct(productId, payload) {
  return authenticatedRequest(`/api/vendor/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteVendorProduct(productId) {
  return authenticatedRequest(`/api/vendor/products/${productId}`, {
    method: 'DELETE',
  })
}

export async function fetchCustomerSummary() {
  return authenticatedRequest('/api/customer/summary')
}

export async function requestPasswordReset(email, role = 'customer') {
  return request('/api/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export async function completePasswordReset(token, newPassword) {
  return request('/api/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function addToWishlist(productId) {
  const wishlistToken = getToken('marketwave_wishlist_token')
  return request('/api/wishlist/items', {
    method: 'POST',
    headers: { 'x-wishlist-token': wishlistToken },
    body: JSON.stringify({ product_mongo_id: productId }),
  })
}

export async function removeFromWishlist(productId) {
  const wishlistToken = getToken('marketwave_wishlist_token')
  return request(`/api/wishlist/items/${productId}`, {
    method: 'DELETE',
    headers: { 'x-wishlist-token': wishlistToken },
  })
}

export async function loginUser(email, password) {
  const res = await request('/api/customer/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  if (res?.token) setAuthToken(res.token, 'customer')
  return res
}

export async function loginAdmin(email, password) {
  const res = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res?.token) setAuthToken(res.token, 'admin')
  return res
}

export async function loginVendor(email, password) {
  const res = await request('/api/vendor/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res?.token) setAuthToken(res.token, 'vendor')
  return res
}

export async function loginCustomer(email, password) {
  const res = await request('/api/customer/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res?.token) setAuthToken(res.token, 'customer')
  return res
}

export async function registerCustomer(payload) {
  const res = await request('/api/customer/register', { method: 'POST', body: JSON.stringify(payload) })
  if (res?.token) setAuthToken(res.token, 'customer')
  return res
}

export async function registerVendor(payload) {
  const res = await request('/api/vendor/register', { method: 'POST', body: JSON.stringify(payload) })
  if (res?.token) setAuthToken(res.token, 'vendor')
  return res
}

export async function registerAdmin(payload) {
  const res = await request('/api/admin/register', { method: 'POST', body: JSON.stringify(payload) })
  if (res?.token) setAuthToken(res.token, 'admin')
  return res
}

export async function createOrder(payload) {
  // payload: { user_id?, shipping_address_id?, items: [{ product_mongo_id, quantity, vendor_id, unit_price }], currency?: 'INR' }
  const token = getAuthToken('customer') || getAuthToken()
  return request('/api/orders', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  })
}

export { getAuthToken, getAuthUserId, setAuthToken }
