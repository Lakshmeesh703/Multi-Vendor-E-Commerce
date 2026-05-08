-- =============================================
-- Multi-Vendor E-Commerce Platform - PostgreSQL Schema
-- Database: Supabase PostgreSQL
-- Normalization: 3NF
-- =============================================

-- =============================================
-- 1. USERS TABLE (Base entity for all roles)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for login optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. VENDORS TABLE (Store information)
-- =============================================
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    store_name VARCHAR(255) NOT NULL,
    store_description TEXT,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for vendor queries
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_approval_status ON vendors(approval_status);

-- =============================================
-- 3. ADDRESSES TABLE (User delivery addresses)
-- =============================================
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for address retrieval
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- =============================================
-- 4. ORDERS TABLE (Order records)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_address_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shipping_address_id) REFERENCES addresses(id)
);

-- Indexes for order queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- =============================================
-- 5. ORDER_ITEMS TABLE (Product details per order)
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId stored as string
    vendor_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Indexes for order item queries
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- =============================================
-- 6. PAYMENTS TABLE (Payment tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'debit_card', 'upi', 'wallet', 'bank_transfer')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes for payment queries
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);

-- =============================================
-- 7. COMMISSIONS TABLE (Vendor commission tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL UNIQUE,
    percentage DECIMAL(5, 2) NOT NULL DEFAULT 5.00 CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- =============================================
-- 8. CART ITEMS TABLE (Session-based / persistent cart)
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    product_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId
    vendor_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    UNIQUE(user_id, product_id)
);

-- Index for cart retrieval
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- =============================================
-- 9. WISHLIST TABLE (Saved products)
-- =============================================
CREATE TABLE IF NOT EXISTS wishlist_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    product_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

-- Index for wishlist retrieval
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);

-- =============================================
-- SAMPLE DATA (for testing)
-- =============================================

-- Admin User
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@ecommerce.com', 'admin_password_hash', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Sample Vendor
INSERT INTO users (name, email, password, role) VALUES 
('John Vendor', 'vendor@ecommerce.com', 'vendor_password_hash', 'vendor')
ON CONFLICT (email) DO NOTHING;

-- Sample Customer
INSERT INTO users (name, email, password, role) VALUES 
('Jane Customer', 'customer@ecommerce.com', 'customer_password_hash', 'customer')
ON CONFLICT (email) DO NOTHING;
