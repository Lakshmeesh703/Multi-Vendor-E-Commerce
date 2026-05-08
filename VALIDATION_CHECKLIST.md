# Multi-Vendor E-Commerce Platform - Comprehensive Validation Checklist

**Document Version**: 1.0  
**Date Created**: May 8, 2026  
**Platform**: Node.js/Express + React + PostgreSQL + MongoDB  
**Status**: Ready for systematic testing

---

## 1. AUTHENTICATION WORKFLOWS

### 1.1 Customer Authentication
- [ ] **Test Case**: Customer signup with valid email/password
  - Expected: User created in Mongoose, bcrypt hashed password, returns 201
  - Endpoint: `POST /api/auth/register`
  - Payload: `{ email: "customer@test.com", password: "SecurePass123", name: "John Doe" }`
  - Validation: User exists in MongoDB `customers` collection, password is hashed

- [ ] **Test Case**: Customer signup with duplicate email
  - Expected: Returns 409 Conflict
  - Endpoint: `POST /api/auth/register`
  - Payload: `{ email: "existing@test.com", password: "Pass123", name: "Test" }`
  - Validation: No duplicate created

- [ ] **Test Case**: Customer signup with invalid email format
  - Expected: Returns 400 Bad Request with validation error
  - Endpoint: `POST /api/auth/register`
  - Payload: `{ email: "invalid-email", password: "Pass123", name: "Test" }`
  - Validation: Error message references email format

- [ ] **Test Case**: Customer login with correct credentials
  - Expected: Returns 200 with JWT access token + httpOnly refresh cookie, role='customer'
  - Endpoint: `POST /api/customer/login`
  - Payload: `{ email: "customer@test.com", password: "SecurePass123" }`
  - Validation: JWT contains `role: 'customer'`, Cookie has `httpOnly=true`, `path=/`, `sameSite=strict`

- [ ] **Test Case**: Customer login with wrong password
  - Expected: Returns 401 Unauthorized
  - Endpoint: `POST /api/customer/login`
  - Payload: `{ email: "customer@test.com", password: "WrongPass" }`
  - Validation: No token issued

- [ ] **Test Case**: Customer attempts to login via `/api/auth/login` (generic endpoint)
  - Expected: Returns 401 (not accessible, role validation fails)
  - Endpoint: `POST /api/auth/login`
  - Payload: Valid customer credentials
  - Validation: Route properly hardened to customer-only

- [ ] **Test Case**: Customer attempts to login via `/api/vendor/login`
  - Expected: Returns 401 Unauthorized (wrong role)
  - Endpoint: `POST /api/vendor/login`
  - Payload: `{ email: "customer@test.com", password: "SecurePass123" }`
  - Validation: Vendor-only route rejects customer

- [ ] **Test Case**: Customer password reset request
  - Expected: Returns 200, generates reset token, sends email (if SMTP configured)
  - Endpoint: `POST /api/auth/forgot-password`
  - Payload: `{ email: "customer@test.com" }`
  - Validation: Reset token created and stored with expiration (15 min typical)

- [ ] **Test Case**: Customer reset password with valid token
  - Expected: Returns 200, password updated, old token invalidated
  - Endpoint: `POST /api/auth/reset-password`
  - Payload: `{ token: "reset-token-xyz", newPassword: "NewSecurePass456" }`
  - Validation: Old password no longer works, new password works

- [ ] **Test Case**: Customer reset password with expired token
  - Expected: Returns 400 Bad Request (token expired)
  - Endpoint: `POST /api/auth/reset-password`
  - Payload: `{ token: "expired-token", newPassword: "NewPass" }`
  - Validation: Error message indicates token expiration

### 1.2 Vendor Authentication
- [ ] **Test Case**: Vendor signup and login
  - Expected: User created with role='vendor', dashboard accessible
  - Endpoint: `POST /api/vendor/register` → `POST /api/vendor/login`
  - Validation: JWT contains `role: 'vendor'`

- [ ] **Test Case**: Vendor login returns vendor-specific data
  - Expected: Response includes shop_name, commission_rate, approval_status
  - Endpoint: `POST /api/vendor/login`
  - Validation: Vendor metadata returned alongside token

- [ ] **Test Case**: Vendor attempts to access customer dashboard
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/customer/summary`
  - Headers: `Authorization: Bearer {vendor-jwt}`
  - Validation: Role check prevents access

- [ ] **Test Case**: Vendor refresh token flow
  - Expected: Returns 200 with new access token, refresh token extended
  - Endpoint: `POST /api/auth/refresh`
  - Headers: Cookie with httpOnly refresh token
  - Validation: New access token issued, expiry reset to 15 minutes

### 1.3 Admin Authentication
- [ ] **Test Case**: Admin signup and login
  - Expected: User created with role='admin', admin dashboard accessible
  - Endpoint: `POST /api/admin/register` → `POST /api/admin/login`
  - Validation: JWT contains `role: 'admin'`

- [ ] **Test Case**: Admin login returns admin-specific data
  - Expected: Response includes user_count, vendor_count, order_count, total_sales
  - Endpoint: `POST /api/admin/login`
  - Validation: Admin stats returned

- [ ] **Test Case**: Admin attempts to access vendor dashboard
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/vendor/summary`
  - Headers: `Authorization: Bearer {admin-jwt}`
  - Validation: Role check prevents cross-role access

### 1.4 Token Management
- [ ] **Test Case**: JWT token expiration (15 minutes)
  - Expected: After 15 minutes, access token becomes invalid
  - Method: Create token, wait/manipulate time, verify 401 on protected endpoint
  - Validation: Response code 401, error message mentions "token expired"

- [ ] **Test Case**: Refresh token extends session (7 days)
  - Expected: After access token expires, refresh token can issue new access token
  - Endpoint: `POST /api/auth/refresh`
  - Validation: New access token valid for 15 more minutes

- [ ] **Test Case**: Refresh token expiration (7 days)
  - Expected: After 7 days, refresh token no longer valid, forces re-login
  - Method: Simulate 7-day passage, attempt refresh
  - Validation: 401 response, user redirected to login

- [ ] **Test Case**: Missing Authorization header
  - Expected: Returns 401 Unauthorized
  - Endpoint: `GET /api/customer/summary` (protected)
  - Headers: (no Authorization header)
  - Validation: Clear error message about missing token

- [ ] **Test Case**: Malformed Authorization header
  - Expected: Returns 401 Unauthorized
  - Endpoint: `GET /api/customer/summary`
  - Headers: `Authorization: InvalidFormat`
  - Validation: Error indicates invalid format

- [ ] **Test Case**: Token signature tampering
  - Expected: Returns 401 Unauthorized (signature invalid)
  - Method: Modify JWT payload, re-sign with wrong key
  - Validation: Signature verification fails

### 1.5 Google OAuth (Scaffolding Present)
- [ ] **Test Case**: Google OAuth flow initiation
  - Expected: Redirects to Google login
  - Endpoint: `GET /auth/google`
  - Validation: Redirect URL contains Google auth endpoint

- [ ] **Test Case**: Google OAuth callback with valid code
  - Expected: User created/updated in database, JWT issued
  - Endpoint: `GET /auth/google/callback?code=...`
  - Status: Pending real Google credentials
  - Validation: (When configured) User profile synced, token issued

---

## 2. AUTHORIZATION & ROLE-BASED ACCESS CONTROL

### 2.1 Customer Role Access
- [ ] **Test Case**: Customer can access customer dashboard
  - Expected: Returns 200 with customer data
  - Endpoint: `GET /api/customer/summary`
  - Headers: `Authorization: Bearer {customer-jwt}`
  - Validation: Response includes name, email, cart count, order count, total spent

- [ ] **Test Case**: Customer can view own orders
  - Expected: Returns 200 with list of customer's orders
  - Endpoint: `GET /api/customer/orders`
  - Validation: Only customer's orders returned (no cross-customer leakage)

- [ ] **Test Case**: Customer cannot access vendor admin panel
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/vendor/summary`
  - Headers: `Authorization: Bearer {customer-jwt}`

- [ ] **Test Case**: Customer cannot access admin panel
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/admin/summary`
  - Headers: `Authorization: Bearer {customer-jwt}`

### 2.2 Vendor Role Access
- [ ] **Test Case**: Vendor can access vendor dashboard
  - Expected: Returns 200 with vendor stats (products, orders, revenue)
  - Endpoint: `GET /api/vendor/summary`
  - Headers: `Authorization: Bearer {vendor-jwt}`

- [ ] **Test Case**: Vendor can view vendor-specific products
  - Expected: Returns 200 with list of vendor's products
  - Endpoint: `GET /api/vendor/products`
  - Validation: Only vendor's products returned

- [ ] **Test Case**: Vendor can view vendor-specific orders
  - Expected: Returns 200 with orders from vendor's products
  - Endpoint: `GET /api/vendor/orders`
  - Validation: Only orders containing vendor's items returned

- [ ] **Test Case**: Vendor cannot access customer orders (other vendors' customers)
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/customer/orders`
  - Headers: `Authorization: Bearer {vendor-jwt}`

- [ ] **Test Case**: Vendor cannot access admin panel
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/admin/summary`
  - Headers: `Authorization: Bearer {vendor-jwt}`

### 2.3 Admin Role Access
- [ ] **Test Case**: Admin can access admin dashboard
  - Expected: Returns 200 with platform-wide stats
  - Endpoint: `GET /api/admin/summary`
  - Headers: `Authorization: Bearer {admin-jwt}`
  - Validation: Stats include total users, total vendors, total orders, total sales

- [ ] **Test Case**: Admin can view pending vendors
  - Expected: Returns 200 with list of vendors awaiting approval
  - Endpoint: `GET /api/admin/vendors/pending`
  - Validation: Only unapproved vendors returned

- [ ] **Test Case**: Admin can approve a vendor
  - Expected: Returns 200, vendor status changed to approved
  - Endpoint: `POST /api/admin/vendors/{vendor-id}/approve`
  - Payload: `{ approval_status: "approved" }`
  - Validation: Vendor can now login and sell

- [ ] **Test Case**: Admin can reject a vendor
  - Expected: Returns 200, vendor status changed to rejected
  - Endpoint: `POST /api/admin/vendors/{vendor-id}/reject`
  - Validation: Vendor receives rejection notification (if email configured)

- [ ] **Test Case**: Admin cannot edit customer personal data
  - Expected: Returns 403 (admins don't have customer edit perms, for data privacy)
  - Endpoint: `PUT /api/customer/{id}` (if exists)
  - Headers: `Authorization: Bearer {admin-jwt}`

---

## 3. PRODUCT MANAGEMENT WORKFLOWS

### 3.1 Public Product Listing
- [ ] **Test Case**: List all products (no filters)
  - Expected: Returns 200 with array of products
  - Endpoint: `GET /api/products`
  - Validation: Products include title, price, rating, description, images

- [ ] **Test Case**: Filter products by category
  - Expected: Returns 200 with products matching category
  - Endpoint: `GET /api/products?category=electronics`
  - Validation: Only products with category='electronics' returned

- [ ] **Test Case**: Filter products by price range
  - Expected: Returns 200 with products within price range
  - Endpoint: `GET /api/products?minPrice=100&maxPrice=500`
  - Validation: All returned products have price between 100-500

- [ ] **Test Case**: Filter products by rating
  - Expected: Returns 200 with products with min rating
  - Endpoint: `GET /api/products?minRating=4`
  - Validation: All returned products have rating >= 4

- [ ] **Test Case**: Search products by keyword
  - Expected: Returns 200 with products matching search
  - Endpoint: `GET /api/products?search=laptop`
  - Validation: Products contain search term in title or description

- [ ] **Test Case**: Combined filters (category + price + rating)
  - Expected: Returns 200 with products matching all filters
  - Endpoint: `GET /api/products?category=electronics&minPrice=500&minRating=4`
  - Validation: All filters applied correctly (AND logic)

- [ ] **Test Case**: Pagination works
  - Expected: Returns 200 with limited results
  - Endpoint: `GET /api/products?limit=10&offset=0`
  - Validation: Exactly 10 results (or fewer if not enough products)

- [ ] **Test Case**: View single product details
  - Expected: Returns 200 with full product info (including reviews, vendor info)
  - Endpoint: `GET /api/products/{product-id}`
  - Validation: Reviews embedded, vendor name shown, inventory status shown

### 3.2 Vendor Product Management
- [ ] **Test Case**: Vendor adds new product
  - Expected: Returns 201, product created with vendor_id linked
  - Endpoint: `POST /api/vendor/products`
  - Headers: `Authorization: Bearer {vendor-jwt}`
  - Payload: `{ title, description, category, price, inventory, attributes }`
  - Validation: Product appears in `GET /api/vendor/products`

- [ ] **Test Case**: Vendor adds product with flexible attributes (electronics example)
  - Expected: Returns 201, attributes stored in MongoDB Schema.Types.Mixed
  - Endpoint: `POST /api/vendor/products`
  - Payload: `{ title: "Laptop", attributes: { ram: "16GB", storage: "512GB SSD", cpu: "Intel i7" } }`
  - Validation: Attributes retrievable in product detail

- [ ] **Test Case**: Vendor updates own product
  - Expected: Returns 200, product updated
  - Endpoint: `PUT /api/vendor/products/{product-id}`
  - Headers: `Authorization: Bearer {vendor-jwt}`
  - Payload: `{ title: "Updated Title", price: 1500 }`
  - Validation: Changes visible immediately in product detail

- [ ] **Test Case**: Vendor cannot update another vendor's product
  - Expected: Returns 403 Forbidden
  - Endpoint: `PUT /api/vendor/products/{other-vendor-product}`
  - Headers: `Authorization: Bearer {vendor-jwt}`
  - Validation: Error indicates ownership mismatch

- [ ] **Test Case**: Vendor deletes own product
  - Expected: Returns 200, product soft-deleted (status=inactive) or hard-deleted
  - Endpoint: `DELETE /api/vendor/products/{product-id}`
  - Validation: Product no longer appears in public listing

- [ ] **Test Case**: Vendor product with 0 inventory shows as "Out of Stock"
  - Expected: API returns inventory: 0, frontend displays "Out of Stock"
  - Endpoint: `GET /api/products/{product-id}`
  - Validation: Purchase button disabled

- [ ] **Test Case**: Vendor cannot add product with negative price
  - Expected: Returns 400 Bad Request
  - Endpoint: `POST /api/vendor/products`
  - Payload: `{ title: "Product", price: -10 }`
  - Validation: Validation error message returned

---

## 4. CART & WISHLIST WORKFLOWS

### 4.1 Guest Cart (Token-Based)
- [ ] **Test Case**: Guest adds product to cart
  - Expected: Returns 200, cart_token generated/returned, item added
  - Endpoint: `POST /api/cart/add`
  - Payload: `{ product_mongo_id: "...", quantity: 1 }`
  - Validation: Cart token in response (localStorage persisted on frontend)

- [ ] **Test Case**: Guest views cart contents
  - Expected: Returns 200 with list of cart items, product details enriched
  - Endpoint: `GET /api/cart?cart_token=...`
  - Validation: Items include product title, price, vendor info

- [ ] **Test Case**: Guest removes product from cart
  - Expected: Returns 200, item deleted
  - Endpoint: `DELETE /api/cart/remove`
  - Payload: `{ product_mongo_id: "...", cart_token: "..." }`
  - Validation: Item no longer in cart

- [ ] **Test Case**: Guest updates product quantity in cart
  - Expected: Returns 200, quantity updated
  - Endpoint: `PUT /api/cart/update`
  - Payload: `{ product_mongo_id: "...", quantity: 5, cart_token: "..." }`
  - Validation: Quantity changed, subtotal recalculated

- [ ] **Test Case**: Cart persists across browser refreshes
  - Expected: Cart data survives refresh (stored in localStorage)
  - Method: Add item, refresh page, verify item still in cart
  - Validation: Cart token preserved, same items visible

### 4.2 Authenticated Customer Cart
- [ ] **Test Case**: Customer adds product to cart (logged in)
  - Expected: Returns 200, item linked to customer_id (or cart_token)
  - Endpoint: `POST /api/cart/add`
  - Headers: `Authorization: Bearer {customer-jwt}`
  - Payload: `{ product_mongo_id: "...", quantity: 1 }`
  - Validation: Item persisted to database

- [ ] **Test Case**: Customer cart items persist across sessions
  - Expected: Logout and login again, cart items still present
  - Method: Logout, close browser, login again
  - Validation: Cart preserved in database

- [ ] **Test Case**: Customer cannot add negative quantity
  - Expected: Returns 400 Bad Request
  - Endpoint: `POST /api/cart/add`
  - Payload: `{ product_mongo_id: "...", quantity: -5 }`
  - Validation: Error message about quantity

### 4.3 Wishlist (Token-Based)
- [ ] **Test Case**: Guest adds product to wishlist
  - Expected: Returns 200, wishlist_token generated, product added
  - Endpoint: `POST /api/wishlist/add`
  - Payload: `{ product_mongo_id: "..." }`
  - Validation: Product appears in `GET /api/wishlist`

- [ ] **Test Case**: Guest removes product from wishlist
  - Expected: Returns 200, product removed
  - Endpoint: `DELETE /api/wishlist/remove`
  - Payload: `{ product_mongo_id: "...", wishlist_token: "..." }`

- [ ] **Test Case**: Guest moves product from wishlist to cart
  - Expected: Returns 200, item added to cart and removed from wishlist
  - Endpoint: `POST /api/wishlist/move-to-cart`
  - Payload: `{ product_mongo_id: "...", wishlist_token: "..." }`
  - Validation: Item in cart, removed from wishlist

- [ ] **Test Case**: Wishlist shows item price changes
  - Expected: If product price changed since added, current price shown in wishlist
  - Method: Add product, vendor updates price, view wishlist
  - Validation: Price reflects current, not original price

---

## 5. CHECKOUT & ORDER CREATION

### 5.1 Order Creation
- [ ] **Test Case**: Customer places single-vendor order
  - Expected: Returns 201, order created with items, order_id returned
  - Endpoint: `POST /api/orders`
  - Headers: `Authorization: Bearer {customer-jwt}`
  - Payload: `{ cart_items: [...], shipping_address_id: "...", payment_method: "card" }`
  - Validation: Order exists in PostgreSQL `orders` table

- [ ] **Test Case**: Customer places multi-vendor order
  - Expected: Returns 201, single order created with items from multiple vendors
  - Endpoint: `POST /api/orders`
  - Payload: Cart contains items from Vendor A and Vendor B
  - Validation: order_items table contains entries for both vendors, both linked to same order_id

- [ ] **Test Case**: Order creation triggers inventory deduction
  - Expected: Product inventory decremented by order quantity
  - Endpoint: `POST /api/orders`
  - Method: Check inventory before, create order, check inventory after
  - Validation: Inventory reduced by order quantity

- [ ] **Test Case**: Order fails if inventory insufficient
  - Expected: Returns 400 Bad Request (or 409 Conflict)
  - Endpoint: `POST /api/orders`
  - Payload: Order quantity exceeds available inventory
  - Validation: Error indicates stock unavailable, inventory unchanged

- [ ] **Test Case**: Order creation is ACID-safe (transaction)
  - Expected: If payment fails mid-transaction, all changes rolled back
  - Scenario: Simulate payment processor failure during order creation
  - Validation: Order not created, inventory not deducted, payment record not created

- [ ] **Test Case**: Product snapshot captured at purchase
  - Expected: order_items.product_snapshot contains full product data at time of order
  - Endpoint: `GET /api/orders/{order-id}`
  - Validation: order_items.product_snapshot JSONB column populated with title, price, vendor_name, etc.

- [ ] **Test Case**: Order returns correct subtotal and taxes
  - Expected: subtotal = sum(unit_price * quantity), tax = subtotal * tax_rate
  - Endpoint: `POST /api/orders`
  - Validation: Order.total_amount = subtotal + tax + shipping

- [ ] **Test Case**: Guest user must provide shipping address
  - Expected: Returns 400 if shipping_address_id missing
  - Endpoint: `POST /api/orders` (without auth)
  - Payload: No shipping_address_id
  - Validation: Error message about required address

- [ ] **Test Case**: Order email notification sent
  - Expected: Order confirmation email sent to customer
  - Endpoint: `POST /api/orders`
  - Status: Pending SMTP configuration
  - Validation: (When configured) Email appears in outbox table or mail service

### 5.2 Order Retrieval & History
- [ ] **Test Case**: Customer views own orders
  - Expected: Returns 200 with list of customer's orders (no other customers' orders)
  - Endpoint: `GET /api/customer/orders`
  - Headers: `Authorization: Bearer {customer-jwt}`
  - Validation: Only this customer's orders returned

- [ ] **Test Case**: Customer views order detail with items
  - Expected: Returns 200 with order + order_items + product snapshots
  - Endpoint: `GET /api/orders/{order-id}`
  - Validation: order_items includes product_snapshot JSONB with historical data

- [ ] **Test Case**: Vendor views only orders containing their products
  - Expected: Returns 200 with filtered orders
  - Endpoint: `GET /api/vendor/orders`
  - Headers: `Authorization: Bearer {vendor-jwt}`
  - Validation: Only orders with vendor_id in order_items returned

- [ ] **Test Case**: Customer cannot view other customer's order
  - Expected: Returns 403 Forbidden
  - Endpoint: `GET /api/orders/{other-customer-order-id}`
  - Headers: `Authorization: Bearer {customer-jwt}`
  - Validation: Clear error message

### 5.3 Payment Integration (Scaffolding Present)
- [ ] **Test Case**: Order creation initiates payment flow
  - Expected: Returns 200 with payment_id and payment_url
  - Endpoint: `POST /api/orders`
  - Status: Pending Razorpay/Stripe credentials
  - Validation: (When configured) Payment record created, webhook endpoint ready

- [ ] **Test Case**: Payment webhook updates order status
  - Expected: On successful payment webhook, order status = 'confirmed', payment status = 'completed'
  - Endpoint: `POST /api/webhooks/payment` (internal)
  - Validation: Order.status reflects payment status

- [ ] **Test Case**: Failed payment keeps order in 'pending' state
  - Expected: order.status remains 'pending', inventory not deducted
  - Scenario: Customer initiates payment but cancels
  - Validation: Order recoverable if customer retries payment

---

## 6. DATABASE & DATA INTEGRITY

### 6.1 PostgreSQL Schema Validation
- [ ] **Test Case**: All required tables exist
  - Expected: Tables present: users, vendors, orders, order_items, carts, cart_items, wishlists, wishlist_items, payments, commissions, inventory_reservations
  - Method: Query `information_schema.tables`
  - Validation: All 13+ tables present

- [ ] **Test Case**: Primary keys properly defined
  - Expected: Each table has PRIMARY KEY constraint
  - Method: Check schema
  - Validation: No duplicate IDs possible

- [ ] **Test Case**: Foreign keys enforce referential integrity
  - Expected: Cannot insert order_item with invalid order_id
  - Method: Attempt INSERT with non-existent order_id
  - Validation: Database rejects with FOREIGN KEY constraint error

- [ ] **Test Case**: Unique constraints prevent duplicates
  - Expected: Cannot create two users with same email
  - Method: Attempt duplicate email INSERT
  - Validation: Database rejects with UNIQUE constraint error

- [ ] **Test Case**: NOT NULL constraints enforced
  - Expected: Cannot insert user without email
  - Method: Attempt INSERT with NULL email
  - Validation: Database rejects with NOT NULL constraint error

- [ ] **Test Case**: Cart/cart_items join returns complete data
  - Expected: Query `SELECT * FROM carts c JOIN cart_items ci ON c.cart_token = ci.cart_token` returns all cart items
  - Validation: Correct number of rows, all columns present

- [ ] **Test Case**: order_items product_snapshot JSONB column stores full object
  - Expected: product_snapshot contains JSON with title, price, vendor_id, description, attributes
  - Method: Query order_items, inspect JSONB
  - Validation: All fields present and queryable

### 6.2 MongoDB Schema Validation
- [ ] **Test Case**: Product schema stores flexible attributes
  - Expected: Single product can have different attribute sets (electronics vs clothing)
  - Method: Create two products in different categories with different attributes
  - Validation: Both documents valid, attributes vary by category

- [ ] **Test Case**: Product reviews embedded correctly
  - Expected: reviews array contains reviewer name, rating, comment, date
  - Method: Add review to product, query product detail
  - Validation: Review appears in product.reviews array

- [ ] **Test Case**: Vendor/Customer/Admin collections have proper indices
  - Expected: Queries on email use index (fast)
  - Method: Check `db.customers.getIndexes()`
  - Validation: email field indexed

- [ ] **Test Case**: Product rating calculated from reviews
  - Expected: rating field reflects average of review ratings
  - Method: Add multiple reviews, check product.rating
  - Validation: rating = average of all review ratings

### 6.3 Data Consistency
- [ ] **Test Case**: Order total_amount matches calculated value
  - Expected: total_amount = SUM(order_items.unit_price * order_items.quantity) + tax + shipping
  - Method: Create order, verify math
  - Validation: Matches exactly

- [ ] **Test Case**: Commission calculated correctly
  - Expected: commission = order_item.unit_price * quantity * commission_rate
  - Method: Create order, check commissions table
  - Validation: Commission amount correct

- [ ] **Test Case**: Inventory reflects all reservations
  - Expected: available_inventory = total_inventory - SUM(inventory_reservations for this product)
  - Method: Reserve inventory, check available amount
  - Validation: Subtraction correct

- [ ] **Test Case**: Cart item count synced with database
  - Expected: frontend shows same count as backend cart_items rows
  - Method: Add multiple items, verify count
  - Validation: Count matches

---

## 7. SECURITY VALIDATION

### 7.1 Authentication Security
- [ ] **Test Case**: Passwords stored as bcrypt hashes
  - Expected: No plaintext passwords in database
  - Method: Query users table, inspect password column
  - Validation: All passwords start with `$2a$` or `$2b$` (bcrypt format)

- [ ] **Test Case**: JWT uses strong secret
  - Expected: Secret should be >32 characters, random
  - Method: Check `.env` JWT_SECRET length
  - Validation: Length >= 32 characters, not hardcoded

- [ ] **Test Case**: JWT signed with RS256 or HS256 (not none)
  - Expected: Token algorithm in header is secure
  - Method: Decode JWT header
  - Validation: `alg: "HS256"` or `alg: "RS256"`, not `alg: "none"`

- [ ] **Test Case**: Refresh tokens stored in httpOnly cookies
  - Expected: No JavaScript can access refresh token
  - Method: Check Set-Cookie response header
  - Validation: Cookie has `httpOnly=true`, `secure=true` (if HTTPS), `sameSite=strict`

- [ ] **Test Case**: Password reset tokens expire
  - Expected: Reset token valid for only 15 minutes (configurable)
  - Method: Generate reset token, wait/check expiration
  - Validation: Token becomes invalid after TTL

- [ ] **Test Case**: No passwords in logs or error messages
  - Expected: Logs should never contain plaintext passwords or tokens
  - Method: Check backend logs for password mentions
  - Validation: Passwords and tokens redacted

### 7.2 Authorization Security
- [ ] **Test Case**: JWT role claim cannot be forged
  - Expected: User cannot change role in their own token
  - Method: Attempt to JWT with modified role payload
  - Validation: Modified JWT rejected (signature invalid)

- [ ] **Test Case**: Admin cannot be created via public registration
  - Expected: Endpoint forces role='customer', cannot override to admin
  - Method: POST /api/auth/register with `role: "admin"` in payload
  - Validation: Submitted role ignored, user created as customer

- [ ] **Test Case**: API validates request payload
  - Expected: Missing required fields return 400, not 500
  - Method: POST without required fields
  - Validation: 400 with validation error, no 500 server error

### 7.3 Data Protection
- [ ] **Test Case**: Customer cannot access other customer's data
  - Expected: Customer JWT cannot access other customer's orders, addresses, wishlist
  - Method: Fetch other customer's order by ID
  - Validation: 403 Forbidden (not 200 or 404)

- [ ] **Test Case**: Vendor cannot access other vendor's sales data
  - Expected: Vendor cannot view other vendor's orders or revenue
  - Method: Fetch other vendor's orders
  - Validation: 403 Forbidden or filtered to own data only

- [ ] **Test Case**: SQL injection prevention
  - Expected: Parameterized queries used throughout (no string concatenation)
  - Method: Attempt SQL injection in search: `search="; DROP TABLE users; --"`
  - Validation: Query treated as literal string, no injection, database unaffected

- [ ] **Test Case**: NoSQL injection prevention (MongoDB)
  - Expected: Mongoose sanitizes inputs, query operators ($where, $regex) controlled
  - Method: Attempt operator injection in product title
  - Validation: Treated as literal string

- [ ] **Test Case**: XSS prevention
  - Expected: User input (product title, review comments) escaped in HTML response
  - Method: Create product with `<script>alert('xss')</script>` in title
  - Validation: Script tag rendered as text, not executed in browser

- [ ] **Test Case**: CORS configured restrictively
  - Expected: Only http://localhost:3000 (dev) or registered domain (prod) allowed
  - Method: Fetch from different origin
  - Validation: Request blocked (no Access-Control-Allow-Origin header)

- [ ] **Test Case**: No sensitive data in responses
  - Expected: API responses should not include full password hashes, secret keys, etc.
  - Method: Inspect login response
  - Validation: No password_hash, no API keys, only JWT token

### 7.4 HTTPS & Transport Security
- [ ] **Test Case**: Cookies marked as Secure (if HTTPS enabled)
  - Expected: Cookie header includes `Secure` flag
  - Method: Check production cookies
  - Validation: httpOnly=true, Secure=true, SameSite=strict

- [ ] **Test Case**: HSTS header present (if HTTPS enabled)
  - Expected: Response header `Strict-Transport-Security`
  - Method: Check response headers in production
  - Validation: `Strict-Transport-Security: max-age=31536000`

---

## 8. PERFORMANCE & SCALABILITY

### 8.1 Frontend Performance
- [ ] **Test Case**: Bundle size under 250KB (gzipped)
  - Expected: Production build CSS + JS gzipped < 250KB
  - Method: Check `npm run build` output
  - Validation: index-*.js gzipped size < 100KB

- [ ] **Test Case**: Page load time under 2 seconds
  - Expected: First Contentful Paint (FCP) < 2 seconds on 3G connection
  - Method: Lighthouse audit
  - Validation: FCP score >= 90

- [ ] **Test Case**: Lazy loading for product images
  - Expected: Images load only when visible in viewport
  - Method: Network tab inspection while scrolling
  - Validation: Images load on demand, not all at once

- [ ] **Test Case**: Vite dev server hot reload works
  - Expected: Change file, server auto-reloads, no manual refresh needed
  - Method: Edit component, verify browser updates automatically
  - Validation: HMR (Hot Module Replacement) working

### 8.2 Backend Performance
- [ ] **Test Case**: API response time under 500ms
  - Expected: Most endpoints respond within 500ms (excluding payment processing)
  - Method: Measure endpoint response times
  - Validation: avg < 500ms, p99 < 1000ms

- [ ] **Test Case**: Product listing scales to 10,000+ products
  - Expected: Pagination prevents loading all at once
  - Method: Create large dataset, query with limit
  - Validation: Query completes in <500ms even with millions of products

- [ ] **Test Case**: Database queries use indices
  - Expected: Queries on indexed columns (email, product_id, vendor_id) are fast
  - Method: `EXPLAIN ANALYZE` SQL queries
  - Validation: Index scans used, not full table scans

- [ ] **Test Case**: N+1 queries prevented (product listings)
  - Expected: Getting 100 products does not require 100+ separate vendor lookups
  - Method: Count queries while fetching products
  - Validation: Single query + minimal joins, no N+1

- [ ] **Test Case**: Connection pooling active
  - Expected: PostgreSQL pool reuses connections, not creating new ones per request
  - Method: Monitor pg pool stats
  - Validation: Pool size stable, no connection leaks

### 8.3 Concurrent Load
- [ ] **Test Case**: Handles 100 concurrent users browsing
  - Expected: No degradation, responses < 1 second
  - Method: Load test with 100 concurrent requests
  - Validation: All requests complete, no timeouts

- [ ] **Test Case**: Handles 10 concurrent checkout operations
  - Expected: No race conditions, all orders created correctly
  - Method: 10 simultaneous /api/orders requests
  - Validation: All 10 orders created with unique order_ids, inventory correct

- [ ] **Test Case**: Database transaction isolation prevents dirty reads
  - Expected: Concurrent orders do not see uncommitted inventory changes
  - Method: Start transaction, attempt concurrent read
  - Validation: Serialization isolation level enforced

---

## 9. FRONTEND WORKFLOWS

### 9.1 Navigation & Routing
- [ ] **Test Case**: Home page loads and displays featured products
  - Expected: GET /products returns products, frontend renders ProductCard components
  - Method: Navigate to /
  - Validation: Products displayed with title, price, rating, add-to-cart button

- [ ] **Test Case**: Product listing page filters work
  - Expected: Selecting category/price/rating filters products
  - Method: Click filter, page updates
  - Validation: Correct products shown, URL updated with query params

- [ ] **Test Case**: Product detail page shows full information
  - Expected: Product title, description, reviews, vendor info, add-to-cart, wishlist button
  - Method: Click product from listing
  - Validation: All sections visible and correctly formatted

- [ ] **Test Case**: Cart page shows items, quantities, subtotal, tax
  - Expected: Cart displays items with remove/quantity update buttons
  - Method: Add items, navigate to /cart
  - Validation: Correct items shown, prices accurate

- [ ] **Test Case**: Checkout page requires address and payment method
  - Expected: Form validation prevents submit without required fields
  - Method: Click checkout without address
  - Validation: Error message shown

- [ ] **Test Case**: Login page redirects to dashboard after successful login
  - Expected: After POST to /api/customer/login, redirect to /customer/dashboard
  - Method: Login, monitor navigation
  - Validation: Correct role dashboard shown

- [ ] **Test Case**: Guest user attempting protected action redirected to login
  - Expected: Click "add to cart" without login → redirected to /customer/login
  - Method: Clear JWT token, click add-to-cart
  - Validation: Redirected to login page

### 9.2 Form Validation
- [ ] **Test Case**: Email field validation
  - Expected: Invalid email rejected before submit
  - Method: Type invalid email in login form
  - Validation: Error shown, submit disabled

- [ ] **Test Case**: Password field validation
  - Expected: Password < 8 chars rejected
  - Method: Type short password
  - Validation: Error message shown

- [ ] **Test Case**: Required field validation
  - Expected: Cannot submit form with empty required fields
  - Method: Submit blank form
  - Validation: All required fields highlighted with error

- [ ] **Test Case**: Async validation (email uniqueness)
  - Expected: Checking if email exists (during signup) checked in real-time
  - Method: Type email that already exists
  - Validation: Error shown, submit disabled

### 9.3 Error Handling & Messaging
- [ ] **Test Case**: Login error message shown
  - Expected: Invalid credentials show "Invalid email or password"
  - Method: Login with wrong password
  - Validation: Error message displayed, not exposed to re-login

- [ ] **Test Case**: Network error message shown
  - Expected: Backend down → "Unable to reach server" message
  - Method: Stop backend, attempt login
  - Validation: User-friendly error message (not stack trace)

- [ ] **Test Case**: Session expired error handled
  - Expected: Expired JWT shows "Session expired, please login again"
  - Method: Let token expire (15 min), make request
  - Validation: Error message, redirect to login

- [ ] **Test Case**: 401 triggers auto-refresh attempt
  - Expected: If 401 received, try refreshing JWT silently
  - Method: Let access token expire (not refresh), make request
  - Validation: Auto-refresh attempts (visible in network tab)

### 9.4 Accessibility
- [ ] **Test Case**: Keyboard navigation works
  - Expected: Tab key navigates through form fields
  - Method: Press Tab multiple times in login form
  - Validation: Focus moves through all interactive elements

- [ ] **Test Case**: Button labels are descriptive
  - Expected: All buttons have clear text ("Add to Cart", not "Submit")
  - Method: Inspect button text
  - Validation: Screen reader users understand button purpose

- [ ] **Test Case**: Images have alt text
  - Expected: Product images have alt="..." attributes
  - Method: Inspect HTML for product images
  - Validation: Alt text descriptive (not just "image")

- [ ] **Test Case**: Color contrast meets WCAG AA
  - Expected: Text readable even for colorblind users
  - Method: Lighthouse accessibility audit
  - Validation: Contrast ratio >= 4.5:1

---

## 10. WORKFLOW TESTING

### 10.1 Complete Customer Journey
- [ ] **Scenario**: Customer browse → search → add to cart → checkout → place order
  1. Start at / (home)
  2. Click "Browse Products" or search for "laptop"
  3. Click product, add to cart
  4. Click "View Cart"
  5. Click "Checkout"
  6. Enter shipping address
  7. Select payment method
  8. Click "Place Order"
  9. Verify order confirmation page
  10. Check order appears in /customer/orders

- [ ] **Scenario**: Customer wishlist workflow
  1. Browse products
  2. Click heart icon to add to wishlist
  3. Navigate to /wishlist
  4. Verify product listed
  5. Click "Move to Cart" or "Remove from Wishlist"
  6. Verify moved/removed

- [ ] **Scenario**: Customer registration and first order
  1. Click "Customer Login" from home
  2. Click "Sign Up"
  3. Enter email, password, name
  4. Click "Create Account"
  5. System logs in automatically (or shows login form)
  6. Redirect to /customer/dashboard
  7. Browse products and add to cart
  8. Complete checkout
  9. Verify order confirmation

### 10.2 Complete Vendor Journey
- [ ] **Scenario**: Vendor registration → approval → product management
  1. Click "Vendor Login"
  2. Click "Register"
  3. Enter shop_name, email, password
  4. System shows "Awaiting Admin Approval"
  5. Admin logs in, approves vendor (POST /api/admin/vendors/{id}/approve)
  6. Vendor logs in successfully
  7. Navigates to /vendor-dashboard
  8. Clicks "Add Product"
  9. Fills form (title, category, price, attributes, images)
  10. Clicks "Publish"
  11. Product appears in public listing
  12. Vendor clicks "View Sales" and sees orders

- [ ] **Scenario**: Vendor updates inventory after sale
  1. Vendor views /vendor-dashboard
  2. Sees order from customer
  3. Product inventory decremented
  4. Vendor clicks "Edit Product"
  5. Updates inventory quantity
  6. Saves, product updated in listing

### 10.3 Complete Admin Journey
- [ ] **Scenario**: Admin approves vendors and views analytics
  1. Admin logs in (/api/admin/login)
  2. Redirected to /admin-dashboard
  3. Dashboard shows platform stats (users, vendors, orders, revenue)
  4. Admin clicks "Pending Vendors"
  5. Sees list of pending vendors
  6. Clicks "Approve" on vendor
  7. System sends approval email (if SMTP configured)
  8. Vendor can now login and sell

- [ ] **Scenario**: Admin monitors sales and commissions
  1. Admin navigates to "Orders" section
  2. Sees all orders across all vendors
  3. Clicks on order to see order_items and product snapshots
  4. Verifies commission calculation
  5. Navigates to "Commissions" report
  6. Downloads CSV export (if implemented)

### 10.4 Guest/Anonymous User Journey
- [ ] **Scenario**: Guest browses and carts without login
  1. User navigates to / without logging in
  2. Browses products (no login required)
  3. Clicks "Add to Cart"
  4. System generates cart_token
  5. Token stored in localStorage
  6. User continues shopping (token persists)
  7. Navigates to /cart, sees items
  8. Clicks "Checkout"
  9. System prompts "Login to continue"
  10. User redirected to /customer/login
  11. Logs in or creates account
  12. Completes checkout
  13. Order created with customer_id linked

### 10.5 Multi-Vendor Checkout Journey
- [ ] **Scenario**: Customer orders from 2+ vendors in single transaction
  1. Customer adds Product A (from Vendor X) to cart
  2. Customer adds Product B (from Vendor Y) to cart
  3. Customer adds Product C (from Vendor X) to cart
  4. Customer goes to checkout
  5. System creates single order with 3 order_items
  6. order_items has 2 rows with vendor_id=X, 1 row with vendor_id=Y
  7. Products snapshot captured for both vendors
  8. Commissions calculated for each vendor separately
  9. Order confirmation shows all 3 items
  10. Vendor X sees 2 items in their orders
  11. Vendor Y sees 1 item in their orders

---

## 11. EDGE CASES & BOUNDARY CONDITIONS

- [ ] **Test Case**: Empty search results
  - Expected: Returns empty array, UI shows "No products found"
  - Endpoint: `GET /api/products?search=nonexistent`

- [ ] **Test Case**: Order with 0 items (empty cart)
  - Expected: Returns 400 "Cart cannot be empty"
  - Endpoint: `POST /api/orders` with empty items

- [ ] **Test Case**: Decimal prices and currency handling
  - Expected: Price calculations maintain precision (no floating-point errors)
  - Example: 3 x $9.99 = $29.97 (not $29.969999...)

- [ ] **Test Case**: Very large order (100+ items)
  - Expected: Order created successfully, database transaction handles all items
  - Validation: All items in order_items table

- [ ] **Test Case**: Product with special characters in title
  - Expected: Title stored and retrieved correctly (é, ñ, 中文, emoji)
  - Validation: Character set UTF-8, no corruption

- [ ] **Test Case**: Very long product description (>5000 chars)
  - Expected: Stored fully, displayed correctly
  - Validation: No truncation or data loss

- [ ] **Test Case**: Concurrent requests to same product
  - Expected: Inventory updated atomically
  - Scenario: 2 users order last 2 items simultaneously
  - Validation: Both orders succeed OR one fails (no overselling)

- [ ] **Test Case**: Rapid-fire requests (race condition)
  - Expected: Rate limiting prevents abuse (if implemented)
  - Scenario: 100 requests per second from single IP
  - Validation: After N requests, returns 429 Too Many Requests

---

## 12. DEPLOYMENT & DEVOPS

- [ ] **Test Case**: Backend starts with all dependencies
  - Expected: `npm run start` completes without errors
  - Validation: All database connections established

- [ ] **Test Case**: Frontend builds without errors
  - Expected: `npm run build` produces dist/ folder
  - Validation: Build output has index.html + JS + CSS bundles

- [ ] **Test Case**: Environment variables loaded correctly
  - Expected: Backend loads from .env file
  - Validation: Database URL, JWT secret, API keys all available

- [ ] **Test Case**: Error logs captured
  - Expected: Failed requests logged with timestamp, endpoint, error message
  - Validation: Logs help debug production issues

- [ ] **Test Case**: Database seeding works
  - Expected: `npm run seed` populates sample data
  - Validation: Products, users, orders in database

---

## SUCCESS CRITERIA

**All workflows pass if:**
1. All authentication flows complete (registration, login, token refresh, logout)
2. All role-based access controls work (customer, vendor, admin)
3. Cart and wishlist operations complete without data loss
4. Multi-vendor checkout creates single order with multiple vendors
5. Product inventory decremented correctly
6. No data visible to unauthorized users (customer isolation verified)
7. Frontend and backend both start without errors
8. Database transactions are ACID-safe
9. API response times under 500ms
10. No security vulnerabilities (SQL injection, XSS, CORS bypass)

---

## EXECUTION ORDER

**Phase 1 - Critical Path** (Today)
1. Run code quality audits (npm audit, static analysis)
2. Test all 3 authentication flows (customer, vendor, admin)
3. Test role-based access (verify 403 on cross-role access)
4. Test complete customer journey (browse → add → checkout)

**Phase 2 - Core Features** (This week)
5. Test multi-vendor checkout
6. Test cart and wishlist persistence
7. Test product inventory deduction
8. Test database referential integrity

**Phase 3 - Security & Performance** (This week)
9. Test for SQL injection, XSS, CORS bypass
10. Test concurrent load (100 users, 10 checkouts)
11. Verify password hashing and JWT signing
12. Measure API response times and bundle sizes

**Phase 4 - Advanced Features** (Next iteration)
13. Test Google OAuth
14. Test payment webhook handling
15. Test email notifications
16. Test admin analytics

---

**Next Steps:**
1. ✅ This checklist created
2. ⏳ Run npm audit and static analysis
3. ⏳ Begin Phase 1 testing (authentication)
4. ⏳ Document results and generate final validation report
