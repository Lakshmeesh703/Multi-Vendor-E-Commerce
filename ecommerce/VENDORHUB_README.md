# VendorHub - Professional Multi-Role E-Commerce Platform

## Overview
VendorHub is a professional, multi-vendor e-commerce platform designed for India's growing digital marketplace. Built with Node.js, React, PostgreSQL, and MongoDB, it supports three distinct user roles with specialized dashboards and workflows.

## Project Brand
- **Name**: VendorHub
- **Tagline**: Professional Multi-Role Marketplace
- **Emoji/Mark**: 🏪 (Store)

## Key Features

### 1. Multi-Role Authentication System

#### Three User Roles:
- **👥 Customer**: Browse, purchase, manage orders and wishlist
- **🏬 Vendor**: Manage products, inventory, sales orders, and analytics
- **⚙️ Admin**: Platform administration, user management, approvals, and system health

### 2. Professional Dashboards

#### Customer Experience
- Browse and search products across vendors
- Add to cart and wishlist
- Checkout with order tracking
- Account management

#### Vendor Dashboard
- **📊 Overview**: Sales metrics, product counts, revenue tracking
- **📦 Products**: Add, edit, manage product inventory
- **📥 Orders**: View and process customer orders
- **💰 Analytics**: Revenue, ratings, and performance metrics
- **⚙️ Settings**: Store configuration and profile

#### Admin Dashboard
- **📊 Overview**: Platform-wide statistics and KPIs
- **👥 Users**: User management and analytics
- **🏬 Vendors**: Vendor approvals and management
- **📦 Products**: Product moderation and catalog management
- **⚡ Reports**: Business intelligence and reporting
- **🔒 Security**: System monitoring and security controls

### 3. Local Test Credentials (Development)

All test users are created automatically on first seed:

```
Customer:
  Email: customer@vendorhub.local
  Password: customer123

Vendor:
  Email: vendor@vendorhub.local
  Password: vendor123

Admin:
  Email: admin@vendorhub.local
  Password: admin123
```

## Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Databases**:
  - PostgreSQL (Supabase) - Users, orders, transactions
  - MongoDB - Product catalog, inventory
- **Authentication**: JWT (7-day expiry)
- **Security**: bcrypt for password hashing
- **Real-time**: Socket.IO with optional Redis pub/sub

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: CSS modules
- **Package Manager**: npm/yarn

### Infrastructure (Local Development)
- Express serves built frontend as static files
- Single unified port: 4000
- Automatic database seeding

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- PostgreSQL (Supabase)
- MongoDB Atlas

### Installation & Running

From the ecommerce folder:

```bash
bash run.sh
```

Or with full path from project root:

```bash
bash ecommerce/run.sh
```

The app will:
1. ✅ Build the React frontend
2. ✅ Start the Node.js backend on port 4000
3. ✅ Seed test users and products
4. ✅ Serve everything at: **http://localhost:4000**

### Login Flow
1. Open http://localhost:4000
2. Click "Login / Register" (or navigate to /login)
3. Select your role (Customer, Vendor, or Admin)
4. Click "Use Test [Role] Credentials" for quick access
5. Or enter credentials manually

## Architecture

### Backend Structure
```
backend/
  src/
    routes/
      auth.js          - Login, register, role management
      products.js      - Product listing and details
      cart.js          - Shopping cart operations
      wishlist.js      - Wishlist management
      orders.js        - Order creation and tracking
    middleware/
      auth.js          - JWT verification, role-based access
    services/
      orderService.js  - Order processing logic
    models/
      product_mongo.js - Mongoose schema
    db/
      schema.sql       - PostgreSQL tables
```

### Frontend Structure
```
frontend/
  src/
    pages/
      LoginPage.jsx           - Multi-role login interface
      VendorDashboard.jsx     - Vendor management UI
      AdminDashboard.jsx      - Admin control panel
      ProductsPage.jsx        - Product listing
      CartPage.jsx            - Shopping cart
      CheckoutPage.jsx        - Order placement
    styles/
      LoginPage.css           - Login styling
      DashboardPages.css      - Dashboard styling
    api.js                     - API client with auth helpers
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/vendor/request` - Vendor onboarding request

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details

### Orders (Auth Required)
- `POST /api/orders` - Create order (requires auth token)
- `GET /api/orders/:id` - Get order details

### Cart (Token-based)
- `POST /api/cart/items` - Add to cart
- `GET /api/cart` - Fetch cart
- `DELETE /api/cart/items/:id` - Remove from cart

### Wishlist (Token-based)
- `POST /api/wishlist/items` - Add to wishlist
- `GET /api/wishlist` - Fetch wishlist

## Security

### Authentication Flow
1. User logs in with email/password
2. Server verifies credentials using bcrypt
3. JWT token issued with role claim (7-day expiry)
4. Frontend stores token in localStorage
5. All authenticated requests include `Authorization: Bearer <token>` header
6. Backend middleware validates JWT and role

### Role-Based Access
- Routes protected by `requireRole()` middleware
- Login page routes users to appropriate dashboard based on role
- Frontend hides/shows UI elements based on user role

## Development Notes

### Adding Email Authentication
When ready to integrate email authentication:

1. Add email service provider (SendGrid, AWS SES, etc.)
2. Update `POST /api/auth/register` to send verification email
3. Add email verification route
4. Update `.env` with email service credentials
5. Modify login UI to handle email verification workflow

### Extending Vendor Onboarding
Current flow creates vendor request. To complete:

1. Add approval workflow in Admin Dashboard
2. Create `/api/admin/vendors/:id/approve` endpoint
3. Implement document verification (KYC)
4. Add bank account verification
5. Create vendor store setup wizard

### Adding Real-time Features
Redis is configured but optional. To enable:

1. Install and run Redis locally
2. Features auto-enabled: order notifications, product sync, live chat

## Logging & Monitoring

### Console Logs
- Order creation: `order_create { order_id, user_id, items, total_amount }`
- Backend startup: Database connection confirmations
- API errors with request context

### Known Warnings (Development)
- Redis connection errors (optional feature, non-blocking)
- These can be ignored in local development

## Troubleshooting

### Login not working
- Check that backend is running: `curl http://localhost:4000/health`
- Verify users exist in database
- Check browser console for network errors

### Port 4000 in use
```bash
lsof -i :4000
kill -9 <PID>
```

### Database connection errors
- Verify `.env` DATABASE_URL and MONGO_URI
- Check Supabase and MongoDB Atlas credentials
- Ensure IP whitelist includes your machine

## Production Readiness

This is a development scaffold. For production:

- [ ] Implement comprehensive error handling
- [ ] Add rate limiting and CORS restrictions
- [ ] Set up structured logging (Winston, Bunyan)
- [ ] Implement API documentation (Swagger/OpenAPI)
- [ ] Add automated testing (Jest, React Testing Library)
- [ ] Configure CDN for static assets
- [ ] Implement database connection pooling
- [ ] Set up monitoring and alerting
- [ ] Add image optimization and compression
- [ ] Implement caching strategies
- [ ] Security audit (OWASP Top 10)
- [ ] Performance benchmarking and optimization

## License
Internal Development Project

## Support
For issues or questions, contact the development team.

---

**Last Updated**: May 2024
**Maintained By**: Development Team
