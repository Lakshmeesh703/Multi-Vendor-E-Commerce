# Multi-Vendor E-Commerce Platform

A complete full-stack multi-vendor e-commerce platform built with Flask, PostgreSQL (Supabase), and MongoDB.

## 🎯 Features

### Customer Features
- User registration and authentication (Session-based)
- Browse products with advanced filtering (category, price)
- Product detail view with specifications and reviews
- Shopping cart management
- Wishlist functionality
- Secure checkout process
- Order history and tracking
- Multiple payment methods

### Vendor Features
- Vendor registration and approval workflow
- Product management (CRUD operations)
- Product catalog in MongoDB with dynamic attributes
- Sales and order tracking
- Inventory management
- Commission settings

### Admin Features
- User and vendor management
- Vendor approval/rejection
- Commission percentage configuration
- Order monitoring
- Sales reports and analytics
- System statistics and insights

## 🏗️ Architecture

### Tech Stack
- **Backend**: Python Flask (MVC architecture)
- **Frontend**: HTML5 + Pure CSS (No JavaScript frameworks)
- **Databases**: 
  - PostgreSQL (Supabase) - Relational data (3NF normalized)
  - MongoDB - Product catalog (Document-based)

### Database Design

#### PostgreSQL Schema (3NF)
- `users` - User accounts (customer, vendor, admin roles)
- `vendors` - Vendor store information and approval status
- `orders` - Order records
- `order_items` - Individual items in orders
- `payments` - Payment tracking and status
- `addresses` - Customer shipping addresses
- `commissions` - Vendor commission percentages
- `cart_items` - Shopping cart persistence
- `wishlist_items` - Saved products

#### MongoDB Collections
- `products` - Product catalog with:
  - Vendor reference
  - Dynamic attributes (RAM, size, color, etc.)
  - Embedded reviews with ratings
  - Stock management

### Architecture Diagram
```
┌─────────────────────────────────────────────┐
│      Frontend (HTML/CSS - No Frontend Frameworks)        │
├─────────────────────────────────────────────┤
│  Flask Application (Python)                 │
│  ├─ Routes                                  │
│  │  ├─ Auth (register/login/logout)        │
│  │  ├─ Customer (products/cart/checkout)   │
│  │  ├─ Vendor (products/sales/inventory)   │
│  │  └─ Admin (users/vendors/reports)       │
│  └─ Database Modules                       │
├─────────────────────────────────────────────┤
│  PostgreSQL (Supabase)    │  MongoDB        │
│  - Relational Data        │  - Product Doc  │
│  - 3NF Normalized         │  - Dynamic Attrs│
│  - ACID Transactions      │  - Reviews      │
└─────────────────────────────────────────────┘
```

## 📁 Project Structure

```
DBMS_Project/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
├── seed_mongodb.py                 # MongoDB sample data seeder
│
├── db/
│   ├── postgres.py                 # PostgreSQL connection & queries
│   ├── mongodb.py                  # MongoDB connection & queries
│   └── schema.sql                  # PostgreSQL schema (3NF)
│
├── routes/
│   ├── auth.py                     # Authentication routes
│   ├── customer.py                 # Customer routes
│   ├── vendor.py                   # Vendor routes
│   └── admin.py                    # Admin routes
│
├── templates/
│   ├── base.html                   # Base template
│   ├── home.html                   # Home page
│   ├── login.html                  # Login page
│   ├── register.html               # Registration page
│   ├── products.html               # Product listing
│   ├── product_detail.html         # Product details
│   ├── cart.html                   # Shopping cart
│   ├── checkout.html               # Checkout page
│   ├── orders.html                 # Order history
│   ├── order_detail.html           # Order details
│   ├── wishlist.html               # Wishlist page
│   ├── vendor_dashboard.html       # Vendor dashboard
│   ├── vendor_products.html        # Vendor products
│   ├── vendor_add_product.html     # Add product form
│   ├── vendor_edit_product.html    # Edit product form
│   ├── vendor_sales.html           # Vendor sales
│   ├── vendor_inventory.html       # Inventory management
│   ├── admin_dashboard.html        # Admin dashboard
│   ├── admin_users.html            # User management
│   ├── admin_view_user.html        # User details
│   ├── admin_vendors.html          # Vendor management
│   ├── admin_commissions.html      # Commission management
│   ├── admin_orders.html           # Order management
│   ├── admin_reports.html          # Reports & analytics
│   └── error.html                  # Error page
│
├── static/
│   └── css/
│       └── style.css               # Main stylesheet (responsive)
│
└── [Documentation files]
    ├── README.md                   # This file
    └── SETUP.md                    # Setup instructions
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL (Supabase account)
- MongoDB Atlas (MongoDB account)
- Git

### Installation Steps

#### 1. Clone the Repository
```bash
cd "/home/lakshmeesh_shet/Lakshmeesh Shet/VS Code/DBMS_Project"
```

#### 2. Create Virtual Environment
```bash
# On Linux/Mac
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use any text editor
```

Add your Supabase and MongoDB connection strings:
```env
SUPABASE_DB_URL=postgresql://user:password@host:port/database
MONGO_URI=mongodb+srv://username:password@cluster/database
SECRET_KEY=your-secret-key-here
```

#### 5. Initialize Databases

**PostgreSQL (Supabase):**
```bash
# The schema will be auto-initialized when you run the app
# Or manually run the SQL file in Supabase dashboard
cat db/schema.sql
```

**MongoDB (seed sample data):**
```bash
python seed_mongodb.py
```

#### 6. Run the Application
```bash
python app.py
```

The application will start at `http://127.0.0.1:5000`

## 📝 Default Demo Accounts

The application comes with sample data for testing:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@ecommerce.com | password |
| Vendor | vendor@ecommerce.com | password |
| Admin | admin@ecommerce.com | password |

**Note**: Change these passwords in production!

## 🔐 Key Features & Implementation

### Authentication System
- Session-based authentication using Flask-Session
- Password hashing with Werkzeug
- Role-based access control (customer, vendor, admin)
- Protected routes with decorators

### Database Integration
- **PostgreSQL**: Handles relational data with proper ACID transactions
- **MongoDB**: Flexible document model for product catalog
- **Referential Integrity**: Product IDs from MongoDB stored in PostgreSQL
- **Transaction Management**: Order + payment created atomically

### E-Commerce Workflow
1. **Product Browsing**: Fetch products from MongoDB with filters
2. **Cart Management**: PostgreSQL for persistent cart storage
3. **Checkout**: Validate inventory, create order/payment (transaction)
4. **Stock Deduction**: Update MongoDB product stock
5. **Order Tracking**: Complete order history in PostgreSQL

### API Endpoints

#### Customer Routes
- `GET /` - Home page
- `GET /customer/products` - Browse products
- `GET /customer/product/<id>` - Product details
- `GET/POST /customer/cart` - Manage cart
- `GET/POST /customer/checkout` - Checkout
- `GET /customer/orders` - Order history
- `GET /customer/wishlist` - Wishlist

#### Vendor Routes
- `GET /vendor/dashboard` - Dashboard
- `GET/POST /vendor/product/add` - Add product
- `GET/POST /vendor/product/<id>/edit` - Edit product
- `GET /vendor/sales` - Sales tracking
- `GET /vendor/inventory` - Inventory management

#### Admin Routes
- `GET /admin/dashboard` - Dashboard
- `GET /admin/users` - User management
- `GET /admin/vendors` - Vendor management
- `GET /admin/commissions` - Commission settings
- `GET /admin/orders` - Order tracking
- `GET /admin/reports` - Analytics

## 🛠️ Development

### Adding New Features
1. Create route file in `routes/`
2. Register blueprint in `app.py`
3. Create templates in `templates/`
4. Update CSS in `static/css/style.css`

### Database Queries
```python
# PostgreSQL
from db.postgres import pg_db
results = pg_db.execute_query("SELECT * FROM users")

# MongoDB
from db.mongodb import mongo_db
products = mongo_db.get_vendor_products(vendor_id)
```

### Error Handling
All routes include try-catch blocks and flash messages for user feedback.

## 📊 Database Normalization

### PostgreSQL (3NF)
- **1NF**: All columns contain atomic values
- **2NF**: No partial dependencies on composite keys
- **3NF**: No transitive dependencies
- All tables have proper primary and foreign keys
- Indexes on frequently queried columns

### MongoDB Schema (Document Design)
```json
{
  "_id": ObjectId,
  "vendor_id": 1,
  "name": "Product Name",
  "category": "Electronics",
  "price": 999.99,
  "stock": 50,
  "attributes": {
    "processor": "Intel Core i9",
    "ram": "32GB"
  },
  "reviews": [
    {
      "user_id": 2,
      "rating": 5,
      "comment": "Excellent!"
    }
  ]
}
```

## 🔄 Transaction Example

Order creation with atomicity:
```python
queries = [
    ("INSERT INTO orders (...) VALUES (...)", params),
    ("INSERT INTO order_items (...) VALUES (...)", params),
    ("INSERT INTO payments (...) VALUES (...)", params)
]
pg_db.execute_transaction(queries)
mongo_db.update_stock(product_id, quantity)
```

## 🎨 Frontend Design

- **Responsive Design**: Works on mobile, tablet, desktop
- **Pure CSS**: No framework dependencies
- **Accessible**: Semantic HTML
- **User-Friendly**: Clear navigation and feedback
- **Consistent**: Unified color scheme and typography

## 📈 Performance Optimization

- Database indexes on frequently queried columns
- Lazy loading of product images
- Session management for fast navigation
- Efficient MongoDB aggregations
- SQL query optimization

## 🚨 Important Notes

### Security
- Change `SECRET_KEY` in production
- Set `SESSION_COOKIE_SECURE=True` with HTTPS
- Never commit `.env` file
- Implement CSRF protection for forms in production
- Use parameterized queries (already implemented)

### Production Checklist
- [ ] Change SECRET_KEY
- [ ] Update security settings in app.py
- [ ] Set DEBUG=False
- [ ] Configure production database
- [ ] Set up proper logging
- [ ] Enable SSL/HTTPS
- [ ] Set up email notifications
- [ ] Configure payment gateway integration
- [ ] Set up automated backups

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test PostgreSQL
psql postgresql://user:password@host:port/database

# Test MongoDB
mongosh "mongodb+srv://user:password@cluster/database"
```

### Missing Tables
```bash
# Re-run schema
python -c "from db.postgres import pg_db; exec(open('db/schema.sql').read())"
```

### Module Errors
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

## 📚 Learning Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Supabase Documentation](https://supabase.com/docs)

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💼 Author

Full-Stack E-Commerce Platform - Multi-Vendor System
Built with Flask, PostgreSQL & MongoDB

## 📧 Support

For issues, suggestions, or contributions, please create an issue or pull request.

---

**Happy Coding! 🚀**
