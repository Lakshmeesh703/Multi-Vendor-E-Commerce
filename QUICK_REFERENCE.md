# Quick Reference Guide
## Multi-Vendor E-Commerce Platform

---

## 🚀 START HERE

### Installation (Copy & Paste)
```bash
cd "/home/lakshmeesh_shet/Lakshmeesh Shet/VS Code/DBMS_Project"
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python app.py
```

### Access Points
- **App**: http://localhost:5000
- **Customer**: customer@ecommerce.com / password
- **Vendor**: vendor@ecommerce.com / password
- **Admin**: admin@ecommerce.com / password

---

## 📁 File Locations

| Purpose | File |
|---------|------|
| App Start | `app.py` |
| Auth Routes | `routes/auth.py` |
| Customer Features | `routes/customer.py` |
| Vendor Features | `routes/vendor.py` |
| Admin Features | `routes/admin.py` |
| PostgreSQL | `db/postgres.py` |
| MongoDB | `db/mongodb.py` |
| Schema | `db/schema.sql` |
| Styles | `static/css/style.css` |
| Home Page | `templates/home.html` |
| All Templates | `templates/*.html` |

---

## 🔌 API ENDPOINTS

### Customer Routes
```
GET  /                          Home page
GET  /customer/products         Browse products
GET  /customer/product/<id>     Product details
GET  /customer/cart             View cart
POST /customer/cart/add/<id>    Add to cart
POST /customer/cart/remove/<id> Remove from cart
GET  /customer/checkout         Checkout form
POST /customer/checkout         Place order
GET  /customer/orders           Order history
GET  /customer/order/<id>       Order details
GET  /customer/wishlist         Wishlist
POST /customer/wishlist/add/<id>    Add to wishlist
POST /customer/wishlist/remove/<id> Remove from wishlist
```

### Vendor Routes
```
GET  /vendor/dashboard              Dashboard
GET  /vendor/products               Product list
GET  /vendor/product/add            Add product form
POST /vendor/product/add            Create product
GET  /vendor/product/<id>/edit      Edit form
POST /vendor/product/<id>/edit      Update product
POST /vendor/product/<id>/delete    Delete product
GET  /vendor/sales                  Sales page
GET  /vendor/inventory              Inventory page
POST /vendor/inventory/<id>/update  Update stock
```

### Admin Routes
```
GET  /admin/dashboard                      Dashboard
GET  /admin/users                          User list
GET  /admin/users/<id>/view                User details
GET  /admin/vendors                        Vendor list
POST /admin/vendors/<id>/approve           Approve vendor
POST /admin/vendors/<id>/reject            Reject vendor
GET  /admin/commissions                    Commission settings
POST /admin/commissions/<id>/update        Update commission
GET  /admin/orders                         All orders
GET  /admin/reports                        Reports & analytics
```

### Auth Routes
```
GET  /auth/register  Registration page
POST /auth/register  Register user
GET  /auth/login     Login page
POST /auth/login     Authenticate user
GET  /auth/logout    Logout & clear session
```

---

## 🗄️ DATABASE QUERIES

### PostgreSQL Examples
```python
from db.postgres import pg_db

# Get user
user = pg_db.execute_query(
    "SELECT * FROM users WHERE id = %s",
    (user_id,),
    fetch_one=True
)

# Get all orders
orders = pg_db.execute_query(
    "SELECT * FROM orders WHERE user_id = %s",
    (user_id,)
)

# Create order
pg_db.execute_query(
    "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s)",
    (user_id, 99.99, 'pending')
)

# Transaction
queries = [
    ("INSERT INTO orders ...", params),
    ("INSERT INTO payments ...", params)
]
pg_db.execute_transaction(queries)
```

### MongoDB Examples
```python
from db.mongodb import mongo_db

# Get product
product = mongo_db.get_product(product_id)

# Get vendor products
products = mongo_db.get_vendor_products(vendor_id)

# Search products
results = mongo_db.search_products({'category': 'Electronics'})

# Insert product
product_id = mongo_db.insert_product({
    'vendor_id': 1,
    'name': 'Product',
    'price': 99.99,
    'stock': 50
})

# Update stock
mongo_db.update_stock(product_id, quantity)

# Add review
mongo_db.add_review(product_id, {
    'user_id': 2,
    'rating': 5,
    'comment': 'Great!'
})
```

---

## 🎨 Template Inheritance

### Base Template
```html
{% extends "base.html" %}
{% block title %}Page Title{% endblock %}
{% block content %}
    <!-- Your content here -->
{% endblock %}
```

### Common Variables
```html
{{ user_id }}       <!-- Current user ID -->
{{ user_name }}     <!-- Current user name -->
{{ user_role }}     <!-- customer/vendor/admin -->
{{ user_email }}    <!-- Current user email -->
```

### Flash Messages
```html
{% with messages = get_flashed_messages(with_categories=true) %}
    {% for category, message in messages %}
        <div class="alert alert-{{ category }}">
            {{ message }}
        </div>
    {% endfor %}
{% endwith %}
```

---

## 🔐 Authentication Patterns

### Login Required
```python
@customer_bp.route('/orders')
@login_required()
def orders():
    user_id = session['user_id']
    # ...
```

### Role Required
```python
@vendor_bp.route('/dashboard')
@login_required(role='vendor')
def dashboard():
    # Only vendors can access
    # ...
```

### Admin Check
```python
@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    # Only admins can access
    # ...
```

---

## 🛒 E-Commerce Workflow

### Adding to Cart
```python
pg_db.execute_query(
    "INSERT INTO cart_items (user_id, product_id, vendor_id, quantity) VALUES (%s, %s, %s, %s)",
    (user_id, product_id, vendor_id, quantity)
)
```

### Creating Order
```python
# Get cart items
cart_items = pg_db.execute_query(
    "SELECT * FROM cart_items WHERE user_id = %s",
    (user_id,)
)

# Calculate total
total = sum(prd['price'] * prd['qty'] for prd in cart_items)

# Create order in transaction
queries = [
    ("INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s)", 
     (user_id, total, 'pending')),
    ("INSERT INTO payments (order_id, amount, status) VALUES (%s, %s, %s)",
     (order_id, total, 'completed'))
]
pg_db.execute_transaction(queries)

# Deduct stock
for item in cart_items:
    mongo_db.update_stock(item['product_id'], item['quantity'])

# Clear cart
pg_db.execute_query(
    "DELETE FROM cart_items WHERE user_id = %s",
    (user_id,)
)
```

---

## 📊 Status Values

### Order Status
- `pending` - Order created
- `confirmed` - Payment confirmed
- `shipped` - Order shipped
- `delivered` - Delivered to customer
- `cancelled` - Order cancelled

### Payment Status
- `pending` - Payment awaiting
- `completed` - Payment received
- `failed` - Payment failed
- `refunded` - Money refunded

### Vendor Status
- `pending` - Waiting approval
- `approved` - Approved
- `rejected` - Rejected

### User Role
- `customer` - Regular buyer
- `vendor` - Product seller
- `admin` - Platform admin

---

## 🎯 Common Tasks

### Add New Route
```python
# In routes/customer.py
@customer_bp.route('/new-page')
@login_required()
def new_page():
    return render_template('new_page.html')
```

### Add New Template
```html
{% extends "base.html" %}
{% block title %}New Page{% endblock %}
{% block content %}
    <h1>Welcome</h1>
{% endblock %}
```

### Add New Style
```css
/* In static/css/style.css */
.my-class {
    color: var(--primary-color);
    padding: 1rem;
}
```

### Database Query
```python
from db.postgres import pg_db
result = pg_db.execute_query("SELECT * FROM users LIMIT 10")
```

---

## 🚨 Error Handling

### Try-Catch Pattern
```python
try:
    # Database operation
    result = pg_db.execute_query(query)
    flash("Success!", "success")
    return redirect(url_for('view'))
except Exception as e:
    flash(f"Error: {str(e)}", "error")
    return redirect(url_for('view'))
```

### Flash Messages
```python
flash("Success message", "success")  # Green
flash("Error message", "error")      # Red
flash("Warning message", "warning")  # Yellow
flash("Info message", "info")        # Blue
```

---

## 🔧 Configuration

### .env Variables
```env
SUPABASE_DB_URL=postgresql://...
MONGO_URI=mongodb+srv://...
SECRET_KEY=your-key-here
FLASK_ENV=development
DEBUG=True
```

### Flask Config (in app.py)
```python
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
```

---

## 📱 HTML Form Patterns

### Login Form
```html
<form method="POST" class="form">
    <input type="email" name="email" required>
    <input type="password" name="password" required>
    <button type="submit">Login</button>
</form>
```

### Product Form
```html
<form method="POST" class="form">
    <input type="text" name="name" placeholder="Product Name">
    <input type="number" name="price" step="0.01">
    <input type="number" name="stock" min="0">
    <textarea name="description"></textarea>
    <button type="submit">Create Product</button>
</form>
```

### Filter Form
```html
<form method="GET" class="filter-form">
    <select name="category">
        {% for cat in categories %}
        <option>{{ cat }}</option>
        {% endfor %}
    </select>
    <input type="range" name="min_price" value="0" max="5000">
    <button>Apply Filters</button>
</form>
```

---

## 🎓 Learning Paths

### Want to Understand:
- **Database**: Read `db/schema.sql` and `db/postgres.py`
- **Authentication**: Read `routes/auth.py`
- **Commerce Flow**: Read `routes/customer.py` checkout section
- **Admin Features**: Read `routes/admin.py`
- **Frontend**: Read `templates/base.html` and `static/css/style.css`

---

## 🐛 Debugging Tips

### Check Session
```python
print(session)  # Print all session data
print(session.get('user_id'))  # Get specific value
```

### Test Database
```bash
# PostgreSQL
psql "YOUR_CONNECTION_STRING"

# MongoDB
mongosh "YOUR_CONNECTION_STRING"
```

### Flask Shell
```bash
python -c "from app import app; app.shell_context_processor(__name__)"
```

### View Flask Routes
```bash
python -c "from app import app; print([r.rule for r in app.url_map.iter_rules()])"
```

---

## 📚 File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| app.py | 150 | Main Flask app |
| postgres.py | 150 | DB connection |
| mongodb.py | 180 | Mongo connection |
| auth.py | 200 | Auth routes |
| customer.py | 350 | Customer routes |
| vendor.py | 300 | Vendor routes |
| admin.py | 250 | Admin routes |
| base.html | 100 | Base template |
| style.css | 800 | All styles |
| All templates | 2000 | All HTML pages |

---

## ✅ Pre-Launch Checklist

- [ ] Python 3.8+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] .env configured
- [ ] PostgreSQL schema created
- [ ] MongoDB connected
- [ ] Sample data seeded
- [ ] App runs without errors
- [ ] Can login with demo accounts
- [ ] Products display on home page
- [ ] Can add product to cart
- [ ] Can complete checkout
- [ ] Can see order history

---

## 🎉 YOU'RE READY!

Everything is set up and ready to go. Start with:
```bash
python app.py
```

Then open http://localhost:5000 in your browser.

**Happy coding! 🚀**
