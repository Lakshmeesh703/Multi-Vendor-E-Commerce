require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) in environment.');
  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // find a customer
    const custRes = await client.query("SELECT id FROM users WHERE role='customer' LIMIT 1");
    if (!custRes.rows[0]) {
      throw new Error('No customer user found in Postgres');
    }
    const customerId = custRes.rows[0].id;

    // find or create a vendor
    let vendorRes = await client.query('SELECT id FROM vendors LIMIT 1');
    let vendorId;
    if (vendorRes.rows[0]) {
      vendorId = vendorRes.rows[0].id;
    } else {
      // create a placeholder vendor user
      const userRes = await client.query("INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,'vendor') RETURNING id", ['Seed Vendor','seed-vendor@local','x',]);
      const newUserId = userRes.rows[0].id;
      const v = await client.query('INSERT INTO vendors(user_id,store_name,store_description,approval_status) VALUES($1,$2,$3,$4) RETURNING id', [newUserId, 'Seed Vendor Store', 'Created for demo', 'approved']);
      vendorId = v.rows[0].id;
    }

    // create a simple order
    const unitPrice = 499.99;
    const quantity = 1;
    const total = Number((unitPrice * quantity).toFixed(2));

    const orderRes = await client.query('INSERT INTO orders(user_id, total_amount, status, shipping_address_id) VALUES($1,$2,$3,$4) RETURNING id', [customerId, total, 'delivered', null]);
    const orderId = orderRes.rows[0].id;

    await client.query('INSERT INTO order_items(order_id, product_id, vendor_id, quantity, price) VALUES($1,$2,$3,$4,$5)', [orderId, 'seed-manual-1', vendorId, quantity, unitPrice]);

    await client.query('INSERT INTO payments(order_id, payment_method, payment_status, transaction_id, amount) VALUES($1,$2,$3,$4,$5)', [orderId, 'credit_card', 'completed', `manual_seed_${Date.now()}`, total]);

    await client.query('COMMIT');
    console.log('Inserted demo order:', { orderId, total });
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Seed PG only failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end().catch(()=>{});
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
