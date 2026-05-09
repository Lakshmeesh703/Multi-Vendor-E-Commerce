require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) in environment.');

  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const email = process.env.SEED_PENDING_VENDOR_EMAIL || 'pending.vendor@vendorhub.local';
    const name = process.env.SEED_PENDING_VENDOR_NAME || 'Pending Vendor';
    const storeName = process.env.SEED_PENDING_VENDOR_STORE || 'Pending Demo Store';
    const password = process.env.SEED_PENDING_VENDOR_PASSWORD || 'vendor123';

    const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    let userId = existing.rows[0]?.id;

    if (!userId) {
      const userRes = await client.query(
        'INSERT INTO users(name, email, password, role) VALUES($1,$2,$3,\'vendor\') RETURNING id',
        [name, email, password]
      );
      userId = userRes.rows[0].id;
    }

    const vendorRes = await client.query(
      `INSERT INTO vendors(user_id, store_name, store_description, approval_status)
       VALUES($1,$2,$3,'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         store_name = EXCLUDED.store_name,
         store_description = EXCLUDED.store_description,
         approval_status = 'pending'
       RETURNING id`,
      [userId, storeName, 'Awaiting admin approval']
    );

    await client.query('COMMIT');
    console.log(`Seeded pending vendor: ${email} (vendor_id=${vendorRes.rows[0].id})`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed pending vendor failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
