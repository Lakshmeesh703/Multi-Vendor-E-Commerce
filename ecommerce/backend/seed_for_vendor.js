require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) in environment.');
  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vendorEmail = process.env.SEED_VENDOR_EMAIL || 'vendor@vendorhub.local';

    const userRes = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [vendorEmail]);
    if (!userRes.rows[0]) throw new Error(`No Postgres user found for ${vendorEmail}`);
    const userId = userRes.rows[0].id;

    const vendorRow = await client.query('SELECT id FROM vendors WHERE user_id = $1 LIMIT 1', [userId]);
    if (!vendorRow.rows[0]) throw new Error(`No vendor row found linked to user id ${userId}.`);
    const vendorId = vendorRow.rows[0].id;

    const ORDER_COUNT = Number(process.env.SEED_VENDOR_ORDERS || 5);
    let created = 0;
    for (let i = 0; i < ORDER_COUNT; i++) {
      const unitPrice = 199.99 + Math.floor(Math.random()*800);
      const quantity = Math.floor(Math.random()*3) + 1;
      const total = Number((unitPrice * quantity).toFixed(2));

      const orderRes = await client.query('INSERT INTO orders(user_id, total_amount, status, shipping_address_id) VALUES($1,$2,$3,$4) RETURNING id', [userId, total, 'delivered', null]);
      const orderId = orderRes.rows[0].id;

      await client.query('INSERT INTO order_items(order_id, product_id, vendor_id, quantity, price) VALUES($1,$2,$3,$4,$5)', [orderId, `seed_vendor_${Date.now()}_${i}`, vendorId, quantity, unitPrice]);

      await client.query('INSERT INTO payments(order_id, payment_method, payment_status, transaction_id, amount) VALUES($1,$2,$3,$4,$5)', [orderId, 'credit_card', 'completed', `seedv_${Date.now()}_${i}`, total]);

      created++;
    }

    await client.query('COMMIT');
    console.log(`Inserted ${created} demo orders for vendor ${vendorEmail} (vendor_id=${vendorId})`);
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Seed for vendor failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end().catch(()=>{});
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
