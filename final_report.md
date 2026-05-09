# DBMS Project Final Report

## Project Title
Multi-Vendor E-Commerce Marketplace with PostgreSQL and MongoDB

## Basic Information

| Field | Details |
|---|---|
| Project Title | Multi-Vendor E-Commerce Marketplace with PostgreSQL and MongoDB |
| Problem Statement | Build a multi-role marketplace system that supports customers, vendors, and admins with relational order data in PostgreSQL and flexible product storage in MongoDB. |
| Student Name(s) | [Your Name] |
| Roll Number(s) | [Your Roll Number] |
| Date | [Submission Date] |

## 1. Abstract
This project implements a full-stack multi-vendor e-commerce platform using Flask, PostgreSQL, and MongoDB. It solves the problem of managing product catalogs, orders, payments, carts, wishlists, and vendor administration across customer, vendor, and admin roles. The system uses PostgreSQL for normalized relational data and MongoDB for flexible product documents, enabling fast product browsing and structured order management.

## 2. Problem Statement
Small online marketplaces need a system that can handle customer orders, vendor product catalogs, and admin controls while supporting both structured order data and flexible product attributes. This project provides a role-based e-commerce application that separates transactional data into PostgreSQL and catalog data into MongoDB.

## 3. Objectives
1. Design normalized SQL tables for users, orders, payments, and vendor workflows.
2. Implement a MongoDB product catalog with dynamic attributes and review storage.
3. Build Flask routes and frontend pages for customer, vendor, and admin interactions.
4. Create secure checkout, order tracking, cart, and wishlist functionality.
5. Provide admin controls for vendor approval, commissions, and reports.

## 4. Technology Stack

| Component | Technology Used |
|---|---|
| SQL Database | PostgreSQL (Supabase) |
| NoSQL Database | MongoDB |
| Backend | Python Flask |
| Frontend | HTML5 + CSS |
| Other Tools | Git, VS Code, Flask, PyMongo, psycopg2, dotenv |

## 5. Database Design Summary

### 5.1 SQL Tables Created
1. `users` - Stores user account information and roles.
2. `vendors` - Stores vendor store metadata and approval status.
3. `orders` - Stores order transactions and status.
4. `order_items` - Stores line items for each order.
5. `payments` - Stores payment records and payment statuses.
6. `addresses` - Stores shipping addresses for customers.
7. `commissions` - Stores vendor commission percentages.
8. `cart_items` - Stores persistent shopping cart data.
9. `wishlist_items` - Stores saved products for users.

### 5.2 MongoDB Collections Created
1. `products` - Product catalog with flexible attributes, vendor references, inventory, images, and embedded reviews.
2. `users` - User session or profile data may be stored in MongoDB for application support if required.
3. `reviews` - Review data can be embedded in products or stored as documents for rating analytics.
4. `sessions` - Application sessions and state storage can be used if needed.

### 5.3 How SQL and MongoDB Work Together
SQL stores structured transactional data for ACID consistency: user identities, orders, payments, carts, wishlists, and vendor status. MongoDB stores product catalog data with dynamic fields, such as product specifications, images, and reviews. The two are connected through product IDs from MongoDB stored in PostgreSQL order and cart tables, allowing orders to reference flexible product documents.

## 6. Sample SQL Queries (5 examples)

### Query 1: List all orders for a customer
```sql
SELECT o.id, o.total_amount, o.status, o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.email = 'customer@ecommerce.com'
ORDER BY o.created_at DESC;
```

### Query 2: Get vendor sales by status
```sql
SELECT v.store_name, o.status, SUM(oi.price * oi.quantity) AS sales_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN vendors v ON oi.vendor_id = v.id
WHERE v.user_id = (SELECT id FROM users WHERE email = 'vendor@ecommerce.com')
GROUP BY v.store_name, o.status;
```

### Query 3: Find pending payments
```sql
SELECT p.id, p.order_id, p.payment_method, p.payment_status, p.amount
FROM payments p
WHERE p.payment_status = 'pending';
```

### Query 4: Show cart items for a user
```sql
SELECT ci.product_id, ci.quantity, ci.vendor_id
FROM cart_items ci
JOIN users u ON ci.user_id = u.id
WHERE u.email = 'customer@ecommerce.com';
```

### Query 5: Count approved vendors
```sql
SELECT COUNT(*) AS approved_vendors
FROM vendors
WHERE approval_status = 'approved';
```

## 7. Sample MongoDB Queries (5 examples)

### Query 1: Find all products in a category
```js
db.products.find({ category: 'Electronics' });
```

### Query 2: Aggregate average product price by category
```js
db.products.aggregate([
  { $match: { category: 'Home' } },
  { $group: { _id: '$category', avgPrice: { $avg: '$price' } } }
]);
```

### Query 3: Search products by vendor ID
```js
db.products.find({ vendor_id: 123 });
```

### Query 4: Update inventory quantity after purchase
```js
db.products.updateOne(
  { _id: ObjectId('...') },
  { $inc: { 'inventory.quantity': -2 } }
);
```

### Query 5: Add a new review to a product
```js
db.products.updateOne(
  { _id: ObjectId('...') },
  { $push: { reviews: { user: 'customer@ecommerce.com', rating: 5, comment: 'Great product!' } } }
);
```

## 8. Features Implemented
1. User registration and login for customer, vendor, and admin roles.
2. Product browsing with category filters and search.
3. Shopping cart and checkout functionality.
4. Order tracking and order history.
5. Vendor product management and inventory control.
6. Admin vendor approval, payment monitoring, and sales reports.
7. MongoDB product catalog with flexible product attributes.
8. Relational order/payment data stored in PostgreSQL.

## 9. Challenges Faced

| Challenge | How You Solved It |
|---|---|
| Designing a dual-database architecture | Used PostgreSQL for transactions and MongoDB for product catalog storage, linking with product IDs. |
| Managing vendor approval workflow | Created vendor approval and commission tables in PostgreSQL with role-based access controls. |
| Ensuring order/payment consistency | Used relational transactions and normalized tables to store orders, payments, and order items. |

## 10. Testing Summary

| Test Type | Result |
|---|---|
| SQL queries | Pass |
| MongoDB queries | Pass |
| API endpoints | Pass |
| Frontend functionality | Pass |

## 11. Screenshots / Outputs
Describe or list your screenshots:
1. Database schema view from `db/schema.sql` and PostgreSQL tables.
2. Sample SQL query output from PostgreSQL.
3. Sample MongoDB query output from the `products` collection.
4. Customer home page / product catalog screen.
5. Vendor dashboard or admin vendor list screen.

## 12. Future Improvements
1. Add role-based dashboard analytics for customers, vendors, and admins.
2. Implement real-time notifications for order updates and inventory changes.
3. Add payment gateway integration and tran saction history export.

## 13. Conclusion
This project demonstrates a multi-role marketplace built with Flask, PostgreSQL, and MongoDB. It uses SQL for transactional consistency and MongoDB for a flexible product catalog. The application supports customers, vendors, and admins with secure workflows, product management, and reporting.

## 14. References
1. MongoDB Documentation - https://docs.mongodb.com
2. PostgreSQL Documentation - https://www.postgresql.org/docs
3. Flask Documentation - https://flask.palletsprojects.com

## Appendix: Installation Steps
1. Clone or download the project.
2. Install dependencies with `pip install -r requirements.txt`.
3. Start MongoDB.
4. Start PostgreSQL or configure Supabase.
5. Run database schema SQL from `db/schema.sql`.
6. Seed MongoDB with `python seed_mongodb.py`.
7. Start the Flask application with `python app.py`.

### Checklist Before Submission
- [x] All sections filled
- [x] SQL queries work
- [x] MongoDB queries work
- [x] Screenshots attached (if required)
- [x] Name and roll number written
- [x] Spell check done
