require('dotenv').config();

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { Pool } = require('pg');

const Product = require('./src/models/product_mongo');
const VendorModel = require('./src/models/Vendor');
const CustomerModel = require('./src/models/Customer');
const AdminModel = require('./src/models/Admin');
const orderService = require('./src/services/orderService');

const SEED_PRODUCTS = Number(process.env.SEED_PRODUCTS || 500);
const SEED_ORDERS = Number(process.env.SEED_ORDERS || 200);
const SEED_VENDORS = Number(process.env.SEED_VENDORS || 10);
const SEED_CUSTOMERS = Number(process.env.SEED_CUSTOMERS || 40);
const SEED_PASSWORD = String(process.env.SEED_PASSWORD || 'Password@123');

function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function getTableColumns(pgPool, tableName) {
  const r = await pgPool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(r.rows.map(x => x.column_name));
}

async function ensurePgUser(pgPool, { email, role, firstName }) {
  const usersCols = await getTableColumns(pgPool, 'users');
  const normalizedEmail = String(email).trim().toLowerCase();
  const placeholderHash = `external_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

  if (usersCols.has('password_hash')) {
    const q = `INSERT INTO users(email, password_hash, first_name, role)
               VALUES($1,$2,$3,$4)
               ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
               RETURNING id`;
    const r = await pgPool.query(q, [normalizedEmail, placeholderHash, firstName || null, role || 'customer']);
    return r.rows[0].id;
  }

  // Legacy fallback
  if (usersCols.has('password') && usersCols.has('name')) {
    const q = `INSERT INTO users(email, password, name, role)
               VALUES($1,$2,$3,$4)
               ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
               RETURNING id`;
    const r = await pgPool.query(q, [normalizedEmail, placeholderHash, firstName || null, role || 'customer']);
    return r.rows[0].id;
  }

  throw new Error('Unsupported Postgres users table schema (expected password_hash or legacy password/name columns).');
}

async function ensurePgVendorRow(pgPool, { userId, shopName }) {
  const vendorsCols = await getTableColumns(pgPool, 'vendors').catch(() => null);
  if (!vendorsCols) return;

  // If there is already a vendor row for this user, don't touch it.
  if (vendorsCols.has('user_id')) {
    const existing = await pgPool.query('SELECT id FROM vendors WHERE user_id = $1 LIMIT 1', [userId]).catch(() => ({ rows: [] }));
    if (existing.rows[0]?.id) return;
  }

  // Prefer inserting with id=userId so vendor_id aligns with what the app uses (pg user id).
  if (vendorsCols.has('store_name')) {
    // Legacy variant
    if (vendorsCols.has('id')) {
      await pgPool.query(
        `INSERT INTO vendors(id, user_id, store_name, store_description, approval_status)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [userId, userId, shopName, 'Seeded demo vendor', 'approved']
      );
    } else {
      await pgPool.query(
        `INSERT INTO vendors(user_id, store_name, store_description, approval_status)
         VALUES($1,$2,$3,$4)`,
        [userId, shopName, 'Seeded demo vendor', 'approved']
      );
    }
    return;
  }

  if (vendorsCols.has('name')) {
    // Current schema variant
    if (vendorsCols.has('id')) {
      await pgPool.query(
        `INSERT INTO vendors(id, user_id, name, description, approved)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [userId, userId, shopName, 'Seeded demo vendor', true]
      );
    } else {
      await pgPool.query(
        `INSERT INTO vendors(user_id, name, description, approved)
         VALUES($1,$2,$3,$4)`,
        [userId, shopName, 'Seeded demo vendor', true]
      );
    }
  }
}

async function ensureMongoAccount(Model, { name, email, passwordHash, extra = {} }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await Model.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    await Model.updateOne(
      { email: normalizedEmail },
      { $set: { name, password: passwordHash, ...extra } }
    );
    return { ...existing, name, password: passwordHash, ...extra };
  }
  const doc = await Model.create({ name, email: normalizedEmail, password: passwordHash, ...extra });
  return doc.toObject();
}

async function ensureDemoAccount({ Model, role, name, email, passwordHash, extra = {} }) {
  await ensureMongoAccount(Model, {
    name,
    email,
    passwordHash,
    extra: { role, ...extra },
  });
}

async function createLegacyOrder(pgPool, payload) {
  const { user_id, status, items, payment_method, transaction_id } = payload;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product_mongo_id).lean();
      if (!product) throw new Error('Product not found: ' + item.product_mongo_id);
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? product.price ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid quantity for ' + item.product_mongo_id);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid price for ' + item.product_mongo_id);
      total += unitPrice * quantity;
      enrichedItems.push({
        product,
        quantity,
        unitPrice,
        vendorId: item.vendor_id || product.vendor_id || null,
      });
    }

    const orderRes = await client.query(
      'INSERT INTO orders(user_id, total_amount, status, shipping_address_id) VALUES($1,$2,$3,$4) RETURNING id',
      [user_id, total, status || 'pending', null]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of enrichedItems) {
      if (!item.vendorId) throw new Error('Legacy schema requires vendor_id (non-null)');
      await client.query(
        `INSERT INTO order_items(order_id, product_id, vendor_id, quantity, price)
         VALUES($1,$2,$3,$4,$5)`,
        [orderId, String(item.product._id), item.vendorId, item.quantity, item.unitPrice]
      );

      // Ensure a commission row exists for this vendor (legacy table is vendor-level, not per-order).
      const exists = await client.query('SELECT 1 FROM commissions WHERE vendor_id = $1 LIMIT 1', [item.vendorId]);
      if (exists.rows.length === 0) {
        await client.query(
          'INSERT INTO commissions(vendor_id, percentage) VALUES($1,$2)',
          [item.vendorId, 0.10]
        );
      }
    }

    const normalizedStatus = String(status || 'pending');
    const paymentStatus = normalizedStatus === 'delivered'
      ? 'completed'
      : normalizedStatus === 'cancelled'
        ? 'refunded'
        : 'pending';

    await client.query(
      `INSERT INTO payments(order_id, payment_method, payment_status, transaction_id, amount)
       VALUES($1,$2,$3,$4,$5)`,
      [orderId, payment_method || 'credit_card', paymentStatus, transaction_id || null, total]
    );

    await client.query('COMMIT');

    // Best-effort inventory decrement
    const inventoryUpdates = enrichedItems.map(item =>
      Product.updateOne(
        { _id: item.product._id, 'inventory.quantity': { $gte: item.quantity } },
        { $inc: { 'inventory.quantity': -item.quantity } }
      ).exec()
    );
    await Promise.all(inventoryUpdates);

    return { order_id: orderId, total_amount: Number(total.toFixed(2)) };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function makeProductDoc({ vendorId, index, category }) {
  const brands = ['Nova', 'Apex', 'Zenith', 'Orion', 'Nimbus', 'Vertex', 'Pulse', 'Glow', 'Craft', 'Peak'];
  const adjectives = ['Premium', 'Classic', 'Ultra', 'Smart', 'Eco', 'Pro', 'Compact', 'Deluxe', 'Advanced', 'Everyday'];
  const nounsByCategory = {
    Electronics: ['Laptop', 'Headphones', 'Smartwatch', 'Bluetooth Speaker', 'Power Bank', 'Wireless Mouse', 'Keyboard', 'Monitor', 'Router', 'SSD'],
    Fashion: ['T-Shirt', 'Sneakers', 'Denim Jacket', 'Hoodie', 'Backpack', 'Sunglasses', 'Watch', 'Jeans', 'Dress', 'Cap'],
    Home: ['Coffee Maker', 'Air Fryer', 'Vacuum Cleaner', 'Table Lamp', 'Bedsheet Set', 'Water Bottle', 'Wall Clock', 'Curtains', 'Cushion', 'Mixer'],
    Beauty: ['Face Wash', 'Moisturizer', 'Sunscreen', 'Shampoo', 'Conditioner', 'Perfume', 'Lip Balm', 'Serum', 'Body Lotion', 'Hair Oil'],
    Sports: ['Yoga Mat', 'Dumbbells', 'Football', 'Cricket Bat', 'Badminton Racket', 'Tennis Ball', 'Sports Bottle', 'Gym Gloves', 'Skipping Rope', 'Resistance Band'],
    Books: ['Paperback Book', 'Hardcover Book', 'Notebook', 'Planner', 'Sketchbook', 'Comic', 'Textbook', 'Cookbook', 'Biography', 'Sci-Fi Novel'],
    Groceries: ['Olive Oil', 'Basmati Rice', 'Coffee Beans', 'Green Tea', 'Almonds', 'Protein Bar', 'Pasta', 'Honey', 'Spices Pack', 'Oats'],
  };

  const brand = pick(brands);
  const noun = pick(nounsByCategory[category] || ['Item']);
  const adjective = pick(adjectives);
  const title = `${brand} ${adjective} ${noun}`;
  const basePrice = {
    Electronics: [49, 1999],
    Fashion: [9, 199],
    Home: [9, 499],
    Beauty: [4, 99],
    Sports: [6, 199],
    Books: [3, 49],
    Groceries: [2, 59],
  }[category] || [5, 199];
  const price = Number((Math.random() * (basePrice[1] - basePrice[0]) + basePrice[0]).toFixed(2));
  const rating = Number((Math.random() * 2 + 3).toFixed(1)); // 3.0 - 5.0
  const sku = `SEED-${vendorId}-${slugify(category)}-${String(index).padStart(4, '0')}`;

  return {
    vendor_id: vendorId,
    title,
    description: `Seeded demo product #${index} in ${category}.`,
    category,
    price,
    rating,
    currency: 'INR',
    attributes: {
      brand,
      category,
      model: `M-${vendorId}-${index}`,
    },
    inventory: {
      sku,
      quantity: randInt(40, 200),
    },
    images: [`https://via.placeholder.com/300x300?text=${encodeURIComponent(noun)}`],
  };
}

async function run() {
  const pgConn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  const mongoUri = process.env.MONGO_URI;
  if (!pgConn) throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) in environment.');
  if (!mongoUri) throw new Error('Missing MONGO_URI in environment.');

  const pgPool = new Pool({ connectionString: pgConn });
  try {
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || 'ecommerce' });

  console.log('🌱 Seeding demo data...');
  console.log(`- Vendors: ${SEED_VENDORS}`);
  console.log(`- Customers: ${SEED_CUSTOMERS}`);
  console.log(`- Products: ${SEED_PRODUCTS}`);
  console.log(`- Orders: ${SEED_ORDERS}`);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Demo accounts for the login pages.
  await ensureDemoAccount({
    Model: CustomerModel,
    role: 'customer',
    name: 'Customer',
    email: 'customer@vendorhub.local',
    passwordHash: await bcrypt.hash('customer123', 10),
    extra: { address: 'Demo Customer Address', cart: [], orders: [] },
  });
  await ensureDemoAccount({
    Model: VendorModel,
    role: 'vendor',
    name: 'Vendor',
    email: 'vendor@vendorhub.local',
    passwordHash: await bcrypt.hash('vendor123', 10),
    extra: { shopName: 'VendorHub Store', gstNumber: 'GST-DEMO-VENDOR', phone: '+91-9000000001' },
  });
  await ensureDemoAccount({
    Model: AdminModel,
    role: 'admin',
    name: 'Admin',
    email: 'admin@vendorhub.local',
    passwordHash: await bcrypt.hash('admin123', 10),
    extra: {},
  });

  // 1) Create vendors + customers in Mongo and Postgres
  const vendors = [];
  for (let i = 1; i <= SEED_VENDORS; i++) {
    const email = `seed-vendor${i}@vendorhub.local`;
    const shopName = `Seed Shop ${i}`;
    await ensureMongoAccount(VendorModel, {
      name: shopName,
      email,
      passwordHash,
      extra: { role: 'vendor', shopName, gstNumber: `GST-SEED-${String(i).padStart(3, '0')}`, phone: `+91-90000${String(10000 + i).slice(-5)}` },
    });
    const userId = await ensurePgUser(pgPool, { email, role: 'vendor', firstName: shopName });
    await ensurePgVendorRow(pgPool, { userId, shopName });
    vendors.push({ email, vendorId: userId, shopName });
  }

  const customers = [];
  for (let i = 1; i <= SEED_CUSTOMERS; i++) {
    const email = `seed-customer${i}@vendorhub.local`;
    const name = `Seed Customer ${i}`;
    await ensureMongoAccount(CustomerModel, {
      name,
      email,
      passwordHash,
      extra: { role: 'customer', address: `${randInt(10, 999)} Seed Street, Bengaluru`, cart: [], orders: [] },
    });
    const userId = await ensurePgUser(pgPool, { email, role: 'customer', firstName: name });
    customers.push({ email, userId });
  }

  // 2) Insert products in Mongo
  const categories = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Books', 'Groceries'];
  const productsToInsert = [];

  for (let i = 1; i <= SEED_PRODUCTS; i++) {
    const vendor = vendors[(i - 1) % vendors.length];
    const category = categories[(i - 1) % categories.length];
    productsToInsert.push(makeProductDoc({ vendorId: vendor.vendorId, index: i, category }));
  }

  // Avoid SKU collisions if you re-run seed.
  const skus = productsToInsert.map(p => p.inventory?.sku).filter(Boolean);
  const existing = await Product.find({ 'inventory.sku': { $in: skus } }, { 'inventory.sku': 1 }).lean();
  const existingSkuSet = new Set(existing.map(p => p.inventory?.sku).filter(Boolean));
  const finalInsert = productsToInsert.filter(p => !existingSkuSet.has(p.inventory?.sku));

  if (finalInsert.length) {
    await Product.insertMany(finalInsert, { ordered: false });
  }

  const mongoProducts = await Product.find({ 'inventory.sku': { $regex: /^SEED-/ } }, { _id: 1, vendor_id: 1, price: 1 }).lean();
  if (!mongoProducts.length) throw new Error('No seeded products found/created in Mongo; cannot create orders.');

  console.log(`✅ Products inserted: ${finalInsert.length} (seeded products available: ${mongoProducts.length})`);

  // 3) Insert orders in Postgres (schema-aware)
  const orderItemsCols = await getTableColumns(pgPool, 'order_items');
  const useNewOrderService = orderItemsCols.has('product_mongo_id') && orderItemsCols.has('unit_price');
  const useLegacyOrderWriter = orderItemsCols.has('product_id') && orderItemsCols.has('price');
  if (!useNewOrderService && !useLegacyOrderWriter) {
    throw new Error('Unsupported Postgres order_items schema. Expected either (product_mongo_id, unit_price) or (product_id, price).');
  }

  let createdOrders = 0;
  for (let i = 1; i <= SEED_ORDERS; i++) {
    const customer = pick(customers);
    const itemCount = randInt(1, 5);
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const p = pick(mongoProducts);
      items.push({
        product_mongo_id: String(p._id),
        quantity: randInt(1, 3),
        // vendor_id is inferred from the product snapshot, but we include it to be explicit.
        vendor_id: p.vendor_id || null,
      });
    }

    const status = pick(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
    const payload = {
      user_id: customer.userId,
      status,
      currency: 'INR',
      payment_method: pick(['credit_card', 'debit_card', 'upi', 'wallet', 'bank_transfer']),
      transaction_id: `seed_${Date.now()}_${i}_${Math.random().toString(16).slice(2)}`,
      items,
    };

    if (useNewOrderService) {
      await orderService.createOrder(pgPool, mongoose.connection, payload);
    } else {
      await createLegacyOrder(pgPool, payload);
    }
    createdOrders++;
    if (createdOrders % 25 === 0) console.log(`🧾 Orders created: ${createdOrders}/${SEED_ORDERS}`);
  }

  console.log(`\n🎉 Seed complete.`);
  console.log(`- Inserted products (this run): ${finalInsert.length}`);
  console.log(`- Inserted orders: ${createdOrders}`);
  console.log('\nLogin accounts created/updated:');
  console.log('- Customer: customer@vendorhub.local / customer123');
  console.log('- Vendor:   vendor@vendorhub.local / vendor123');
  console.log('- Admin:    admin@vendorhub.local / admin123');
  console.log(`- Other seeded vendors: seed-vendor1@vendorhub.local .. seed-vendor${SEED_VENDORS}@vendorhub.local (password: ${SEED_PASSWORD})`);
  console.log(`- Other seeded customers: seed-customer1@vendorhub.local .. seed-customer${SEED_CUSTOMERS}@vendorhub.local (password: ${SEED_PASSWORD})`);

  } finally {
    await pgPool.end().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
}

run()
  .then(() => {
    // Ensure the process doesn't hang due to stray open handles.
    process.exit(0);
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
