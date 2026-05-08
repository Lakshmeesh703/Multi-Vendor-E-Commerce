# 🚀 Complete Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites Check
```bash
# Check Python version (should be 3.8+)
python3 --version

# Check pip
pip3 --version
```

### 2. Virtual Environment Setup
```bash
cd "/home/lakshmeesh_shet/Lakshmeesh Shet/VS Code/DBMS_Project"

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

**Output should show:**
```
Successfully installed Flask-2.3.3 Flask-Session-0.5.0 psycopg2-binary-2.9.7 PyMongo-4.6.0 ...
```

### 4. Configure Database Credentials

**Copy the environment template:**
```bash
cp .env.example .env
```

**Edit .env with your credentials:**
```bash
nano .env
```

**Replace these values:**
```env
SUPABASE_DB_URL=postgresql://postgres.ixnvfngarjcfuywfctst:Chinnu@8861@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
MONGO_URI=mongodb+srv://E_Commerce:Chinnu@8861@cluster0.tpvwgzh.mongodb.net/ecommerce
SECRET_KEY=my-secret-key-12345
```

### 5. Initialize PostgreSQL (Supabase)

**Option A: Using Supabase Web Dashboard**
1. Go to https://supabase.com/dashboard
2. Open your database's SQL Editor
3. Copy-paste entire contents of `db/schema.sql`
4. Click "Execute"

**Option B: Using Command Line**
```bash
# Install psql if not present
# Then run:
psql "postgresql://postgres.ixnvfngarjcfuywfctst:Chinnu@8861@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" < db/schema.sql
```

### 6. Seed MongoDB with Sample Data
```bash
python seed_mongodb.py
```

**Expected output:**
```
✓ Inserted 5 sample products
✓ Created MongoDB indexes
Done!
```

### 7. Run the Application
```bash
python app.py
```

**Expected output:**
```
============================================================
Multi-Vendor E-Commerce Platform
============================================================

Initializing databases...
✓ Connected to PostgreSQL (Supabase)
✓ Connected to MongoDB
✓ Database schema initialized
✓ MongoDB products collection initialized

✓ Application ready!
  → Starting server at http://localhost:5000
  → Login: admin@ecommerce.com / vendor@ecommerce.com / customer@ecommerce.com
============================================================

 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 8. Access the Application

Open browser and visit: **http://localhost:5000**

## 🔑 Test Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 👤 Customer | customer@ecommerce.com | password | Browse, buy, review |
| 🏪 Vendor | vendor@ecommerce.com | password | Manage products, sales |
| 🛡️ Admin | admin@ecommerce.com | password | Approve vendors, reports |

## ✅ Verification Checklist

- [ ] Python 3.8+ installed
- [ ] venv created and activated
- [ ] requirements.txt installed
- [ ] .env file configured
- [ ] PostgreSQL schema created
- [ ] MongoDB seeded
- [ ] App running on http://localhost:5000
- [ ] Can login with demo accounts
- [ ] Products display on home page

## 🧪 Testing the Features

### Customer Journey
1. **Register**: Visit `/auth/register` (or login with demo account)
2. **Browse**: Go to `/customer/products`
3. **Wishlist**: Click "❤️ Wishlist" on product
4. **Cart**: Add items to cart
5. **Checkout**: Complete purchase
6. **Orders**: View order history

### Vendor Journey
1. **Login**: Use vendor demo account
2. **Dashboard**: View `/vendor/dashboard`
3. **Add Product**: `/vendor/product/add`
4. **Manage**: Edit/delete products
5. **Sales**: View sales history

### Admin Journey
1. **Login**: Use admin demo account
2. **Dashboard**: View `/admin/dashboard`
3. **Approve Vendors**: `/admin/vendors`
4. **Reports**: `/admin/reports`
5. **Manage**: Users, commissions, orders

## 🔧 Troubleshooting

### Issue: ModuleNotFoundError

**Solution:**
```bash
# Ensure venv is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

### Issue: Connection refused (PostgreSQL)

**Solution:**
```bash
# Verify connection string in .env
# Test connection:
psql "YOUR_CONNECTION_STRING"
```

### Issue: MongoDB connection timeout

**Solution:**
```bash
# Check internet connection
# Verify connection string in .env
# Check IP whitelist in MongoDB Atlas dashboard
```

### Issue: Port 5000 already in use

**Solution:**
```bash
# Kill existing process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
FLASK_PORT=5001 python app.py
```

### Issue: CSRF token warnings

**Note**: The application uses simple session-based auth for demo. 
For production, implement CSRF protection via Flask-WTF.

## 📦 Project Structure Overview

```
DBMS_Project/
├── app.py                    ← Main application (START HERE)
├── requirements.txt          ← Python dependencies
├── .env.example             ← Configuration template
├── seed_mongodb.py          ← Sample data
│
├── db/
│   ├── postgres.py          ← PostgreSQL connection
│   ├── mongodb.py           ← MongoDB connection
│   └── schema.sql           ← Database schema
│
├── routes/                  ← Application routes
│   ├── auth.py             ← Login/Register
│   ├── customer.py         ← Customer features
│   ├── vendor.py           ← Vendor features
│   └── admin.py            ← Admin features
│
├── templates/              ← HTML pages
│   ├── base.html           ← Navigation, layout
│   ├── home.html           ← Home page
│   ├── products.html       ← Product listing
│   └── [other pages...]
│
└── static/
    └── css/style.css       ← Styling
```

## 🎯 Next Steps After Setup

1. **Customize**: Modify `.env` for your setup
2. **Add Products**: Use vendor account to add items
3. **Test Checkout**: Complete a purchase
4. **Explore Admin**: View reports and analytics
5. **Deploy**: Follow deployment guide

## 📱 Mobile Access

To access from another device on the same network:

```bash
# Find your IP
hostname -I

# Start Flask with accessible IP
python -c "from app import app; app.run(host='0.0.0.0', port=5000)"

# Access from: http://YOUR_IP:5000
```

## 🌐 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| SUPABASE_DB_URL | PostgreSQL connection | postgresql://user:pass@host:port/db |
| MONGO_URI | MongoDB connection | mongodb+srv://user:pass@cluster/db |
| SECRET_KEY | Session encryption key | my-secret-key-12345 |
| FLASK_ENV | Environment type | development/production |
| DEBUG | Debug mode | True/False |

## 🎓 Database Design Notes

### PostgreSQL (3NF)
- Organized for relationships and transactions
- Indexes for fast queries
- FK constraints for data integrity
- ACID compliant

### MongoDB
- Document-based product storage
- Flexible schema for attributes
- Embedded reviews
- Indexed for search performance

## 🚀 Production Deployment

Before deploying to production:

1. Change `SECRET_KEY` in .env
2. Set `DEBUG=False`
3. Use environment-specific configs
4. Set up proper logging
5. Configure HTTPS
6. Enable CSRF protection
7. Set up email services
8. Configure payment gateway
9. Set up database backups
10. Use production WSGI server (Gunicorn)

## 📞 Getting Help

### Check Logs
```bash
# Flask logs are printed to console
# Check for connection errors
```

### Test Individual Components
```python
# Test PostgreSQL
from db.postgres import pg_db
print(pg_db.execute_query("SELECT VERSION()"))

# Test MongoDB
from db.mongodb import mongo_db
print(mongo_db.get_db().list_collection_names())
```

### Verify Installations
```bash
pip list | grep -E "Flask|psycopg2|pymongo"
```

---

**✅ You're all set! Happy coding! 🎉**
