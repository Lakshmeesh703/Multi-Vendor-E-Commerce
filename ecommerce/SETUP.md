## 🚀 MarketWave E-Commerce Platform — Quick Start Guide

This is a **production-ready multi-vendor e-commerce platform** with:
- ✅ **PostgreSQL** (3NF normalized schema) for users, vendors, orders, payments
- ✅ **MongoDB** (flexible documents) for product catalog with custom attributes
- ✅ **Redis** (real-time inventory sync, WebSocket events)
- ✅ **Node.js/Express** backend with JWT auth, RBAC, ACID transactions
- ✅ **React + React Router** frontend with Vite, responsive design

---

## 📋 Prerequisites

You need to install these services **before running the project**:

### Option 1: Local Database Setup (Recommended for Development)

**Install PostgreSQL:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Windows
# Download from https://www.postgresql.org/download/windows/
```

**Install MongoDB:**
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu/Debian
sudo apt-get install -y mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

**Install Redis:**
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Windows
# Download from https://github.com/microsoftarchive/redis/releases
```

### Option 2: Docker Compose (Easier)

Install Docker: https://docs.docker.com/get-docker/

Then run:
```bash
cd ecommerce
docker-compose up -d
# Waits 10s for services to start
sleep 10
npm run seed  # in backend folder
```

---

## 🏃 Running the Project Locally

### Step 1: Start Database Services

**If using local installations:**
```bash
# Terminal 1: PostgreSQL
postgres -D /usr/local/var/postgres  # macOS
# or: pg_ctl -D /var/lib/postgresql/10/main start  # Linux

# Terminal 2: MongoDB
mongod

# Terminal 3: Redis
redis-server
```

### Step 2: Initialize Database Schema

```bash
cd ecommerce/backend

# Create the Postgres database
createdb ecommerce

# Run the schema migration
psql ecommerce < src/db/schema.sql
```

### Step 3: Seed Sample Data

```bash
cd ecommerce/backend
npm run seed
```

**Output:**
```
Seeding users...
Creating vendors...
Seeding products...
  ✓ Added: UltraView 14" Laptop ($899)
  ✓ Added: Smart Noise-Cancel Headset ($129)
  ✓ Added: USB-C Fast Charger 30W ($19.99)
  ✓ Added: StreetFlex Premium Sneakers ($69.99)
  ✓ Added: Everyday Cotton T-Shirt ($29.99)
  ✓ Added: Classic Denim Jacket ($79.99)

✅ Seed complete!

Created: 6 products
```

### Step 4: Start the Backend Server

```bash
cd ecommerce/backend
npm run start
```

**Expected output:**
```
✓ Connected to PostgreSQL (Supabase)
✓ Connected to MongoDB
✓ Connected to Redis
Backend listening on http://localhost:4000
```

### Step 5: Start the Frontend Dev Server

**In another terminal:**
```bash
cd ecommerce/frontend
npm run dev
```

**Expected output:**
```
  VITE v5.4.21  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

---

## 🌐 Access the Application

Open your browser and navigate to: **http://localhost:5173**

### Demo Flows

**1. Browse Products:**
- Go to `/products`
- Filter by category, price, rating
- Search using the top bar

**2. Add to Cart:**
- Click any product card → "Add to Cart"
- Persists to backend (no login required)
- View at `/cart`

**3. Vendor Features:**
- Go to `/vendor` → Dashboard
- See stats: Today Sales, Active Listings, Pending Orders

**4. Admin Panel:**
- Go to `/admin`
- Vendor approval, commission management, dispute resolution

**5. Authentication (Backend Ready):**
- POST `/api/auth/register` → Create customer account
- POST `/api/auth/login` → Get JWT token
- POST `/api/auth/vendor/request` → Become a vendor

---

## 📚 API Endpoints

### Products
- `GET /api/products` → List products (filters: category, min_price, max_price, min_rating, sort)
- `POST /api/products` → Create product (vendor-only)
- `PUT /api/products/:id` → Update product (vendor-only)
- `DELETE /api/products/:id` → Delete product (vendor-only)

### Cart
- `GET /api/cart` (header: `x-cart-token`) → Fetch cart items
- `POST /api/cart/items` → Add to cart
- `DELETE /api/cart/items/:productId` → Remove from cart

### Wishlist
- `GET /api/wishlist` (header: `x-wishlist-token`) → Fetch wishlist
- `POST /api/wishlist/items` → Add to wishlist
- `DELETE /api/wishlist/items/:productId` → Remove from wishlist

### Auth
- `POST /api/auth/register` → Create account
- `POST /api/auth/login` → Get JWT
- `POST /api/auth/vendor/request` → Request vendor access

### Orders
- `POST /api/orders` → Create order (user-only, ACID-safe)

---

## 💾 Database Schema

### PostgreSQL (Normalized 3NF)
```
users → vendors, orders, addresses
orders → order_items, payments, commissions
order_items → products (via product_mongo_id)
payments → webhooks
cart_items, wishlist_items → products (via product_mongo_id)
```

### MongoDB (Flexible)
```
products {
  _id, vendor_id, title, price, rating,
  category, attributes {}, inventory {},
  images [], reviews []
}
```

---

## 🔧 Project Structure

```
ecommerce/
├── backend/
│   ├── src/
│   │   ├── index.js (Express server)
│   │   ├── db/schema.sql (3NF schema)
│   │   ├── routes/ (auth, products, cart, wishlist)
│   │   ├── models/ (Mongoose schemas)
│   │   ├── middleware/ (auth, RBAC)
│   │   ├── services/ (orderService, etc.)
│   │   ├── workers/ (outboxWorker, reservationWorker)
│   │   └── webhooks/ (payments webhook)
│   ├── seed.js (sample data)
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx (React Router shell)
│   │   ├── api.js (fetch wrapper)
│   │   ├── data.js (sample categories, products)
│   │   ├── styles.css (responsive grid)
│   │   ├── pages/ (Home, Products, Cart, etc.)
│   │   └── main.jsx (entry)
│   ├── package.json
│   ├── vite.config.js (dev proxy to backend)
│   └── index.html
│
├── docker-compose.yml (optional)
├── .github/workflows/ci.yml (GitHub Actions)
└── README.md (this file)
```

---

## 🎯 Key Features

### Frontend
- ✅ Sticky header with search + category filter
- ✅ Mega-menu with category navigation
- ✅ Product grid with live filtering (price, rating, category, sort)
- ✅ Product detail page with Add to Cart / Wishlist
- ✅ Cart page with live subtotal, remove, checkout
- ✅ Wishlist page with save/remove actions
- ✅ Vendor dashboard with stats
- ✅ Admin panel with vendor approvals
- ✅ Mobile-responsive (reflows to single column ≤720px)
- ✅ React Router SPA (no page refreshes)
- ✅ Guest sessions (localStorage tokens)

### Backend
- ✅ JWT authentication + RBAC (customer, vendor, admin)
- ✅ PostgreSQL with normalized 3NF schema
- ✅ MongoDB with flexible product attributes
- ✅ Cart/wishlist persistence (token-based for guests)
- ✅ ACID-safe order creation (SQL transaction)
- ✅ Outbox pattern (reliable integration)
- ✅ Redis pub/sub + Socket.io (real-time inventory)
- ✅ Inventory reservation workers
- ✅ Payment webhook handler
- ✅ Vendor onboarding with approval flow

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Backend on 4000
lsof -i :4000
kill <PID>

# Frontend on 5173
lsof -i :5173
kill <PID>
```

### PostgreSQL Connection Refused
Ensure Postgres is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Check status
pg_isready
```

### MongoDB Connection Timeout
Ensure MongoDB is running:
```bash
# Check if mongod process exists
ps aux | grep mongod

# Start manually
mongod --dbpath /path/to/data
```

### Redis Connection Failed
Ensure Redis is running:
```bash
# Check
ps aux | grep redis

# Start manually
redis-server
```

---

## 📝 Sample Test Data

After seeding, the database contains:

**Products:**
1. **UltraView 14" Laptop** — $899 (Electronics)
   - 16GB RAM, 1TB SSD, Intel i7
   - Rating: 4.8/5 (214 reviews)

2. **Smart Noise-Cancel Headset** — $129 (Electronics)
   - ANC, Bluetooth 5.3, 48h battery
   - Rating: 4.9/5 (301 reviews)

3. **USB-C Fast Charger 30W** — $19.99 (Electronics)
   - Travel-friendly, Multi-device
   - Rating: 4.7/5 (523 reviews)

4. **StreetFlex Premium Sneakers** — $69.99 (Fashion)
   - Lightweight, Anti-slip sole
   - Rating: 4.7/5 (98 reviews)

5. **Everyday Cotton T-Shirt** — $29.99 (Fashion)
   - 100% Cotton, Slim fit
   - Rating: 4.6/5 (147 reviews)

6. **Classic Denim Jacket** — $79.99 (Fashion)
   - Premium denim, Button closure
   - Rating: 4.8/5 (256 reviews)

**Test Accounts:**
- Vendor: `vendor@techzone.com` / password: `vendor123`
- Customer: `customer@example.com` / password: `customer123`

---

## 🚀 Deployment

See `.github/workflows/ci.yml` for GitHub Actions CI/CD pipeline.

For production:
1. Use environment variables (`.env` in CD/CD), never hardcode secrets
2. Enable HTTPS/TLS
3. Use managed databases (RDS, Atlas, etc.)
4. Set up monitoring and logging
5. Use a reverse proxy (nginx)
6. Enable rate limiting and CORS properly

---

## 📧 Support

For issues or questions, refer to the code comments in:
- Backend: `src/index.js`, `src/services/orderService.js`
- Frontend: `src/App.jsx`, `src/api.js`

**Happy marketplace building!** 🎉
