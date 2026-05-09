-- SQL schema normalized to 3NF for users, vendors, orders, payments, addresses
-- Note: run in Postgres. Adjust types as needed.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer', -- customer | vendor | admin
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  city TEXT,
  country TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0.10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | shipped | completed | refunded
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  shipping_address_id INTEGER REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id INTEGER REFERENCES vendors(id),
  product_mongo_id TEXT NOT NULL, -- store MongoDB product _id as text
  product_snapshot JSONB NOT NULL, -- store product snapshot for audit and pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated | succeeded | failed | refunded
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE commissions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  commission_amount NUMERIC(12,2) NOT NULL
);

-- Simple reservation table for inventory sync; in production use Redis streams or dedicated inventory service
CREATE TABLE inventory_reservations (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  product_mongo_id TEXT NOT NULL,
  vendor_id INTEGER,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved | committed | released
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guest-friendly cart and wishlist support, keyed by browser token
CREATE TABLE carts (
  cart_token TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product snapshot cache for cart/billing (fallback when MongoDB is unavailable)
CREATE TABLE product_snapshots (
  product_mongo_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  vendor_id INTEGER,
  vendor_name TEXT,
  category TEXT,
  images TEXT[] DEFAULT '{}',
  rating NUMERIC(3,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE cart_token_items (
  id BIGSERIAL PRIMARY KEY,
  cart_token TEXT NOT NULL REFERENCES carts(cart_token) ON DELETE CASCADE,
  product_mongo_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  product_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cart_token, product_mongo_id)
);

CREATE TABLE wishlists (
  wishlist_token TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE wishlist_token_items (
  id BIGSERIAL PRIMARY KEY,
  wishlist_token TEXT NOT NULL REFERENCES wishlists(wishlist_token) ON DELETE CASCADE,
  product_mongo_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(wishlist_token, product_mongo_id)
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orderitems_order ON order_items(order_id);

-- Outbox table for reliable integration (outbox pattern)
CREATE TABLE outbox (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Attribute templates stored in Postgres for vendor/category-driven templates
CREATE TABLE attribute_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  template JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
