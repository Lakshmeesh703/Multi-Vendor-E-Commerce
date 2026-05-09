require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing DATABASE_URL');
  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();
  let vendorId = null;
  let vendorEmail = process.env.SEED_VENDOR_EMAIL || 'vendor@vendorhub.local';
  try {
    const userRes = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [vendorEmail]);
    if (!userRes.rows[0]) throw new Error('Vendor user not found');
    const userId = userRes.rows[0].id;
    const vendorRow = await client.query('SELECT id FROM vendors WHERE user_id = $1 LIMIT 1', [userId]);
    if (!vendorRow.rows[0]) throw new Error('Vendor row not found');
    vendorId = vendorRow.rows[0].id;
    const r = await client.query("SELECT COALESCE(SUM(COALESCE(unit_price, price) * quantity),0) AS total, COUNT(*) AS orders FROM order_items WHERE vendor_id = $1", [vendorId]);
    console.log({ vendorEmail, vendorId, total: Number(r.rows[0].total || 0), orders: Number(r.rows[0].orders || 0) });
      // If the above fails because columns differ between schemas, try schema-aware checks
    } catch (err) {
      // inspect columns
      const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items'");
      const colSet = new Set(cols.rows.map(r=>r.column_name));
      if (colSet.has('unit_price')) {
        const r2 = await client.query('SELECT COALESCE(SUM(unit_price * quantity),0) AS total, COUNT(*) AS orders FROM order_items WHERE vendor_id = $1', [vendorId]);
        console.log({ vendorEmail, vendorId, total: Number(r2.rows[0].total || 0), orders: Number(r2.rows[0].orders || 0), used: 'unit_price' });
      } else if (colSet.has('price')) {
        const r2 = await client.query('SELECT COALESCE(SUM(price * quantity),0) AS total, COUNT(*) AS orders FROM order_items WHERE vendor_id = $1', [vendorId]);
        console.log({ vendorEmail, vendorId, total: Number(r2.rows[0].total || 0), orders: Number(r2.rows[0].orders || 0), used: 'price' });
      } else {
        console.error('order_items table has neither unit_price nor price columns', [...colSet])
      }
  } finally {
    client.release();
    await pool.end().catch(()=>{});
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });
