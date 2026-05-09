require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) in environment.');

  const vendorEmail = String(process.env.SEED_VENDOR_EMAIL || 'vendor@vendorhub.local').trim().toLowerCase();
  const productCount = Number(process.env.SEED_VENDOR_PRODUCT_COUNT || 4);
  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT id, name FROM users WHERE email = $1 LIMIT 1', [vendorEmail]);
    if (!userRes.rows[0]) throw new Error(`No Postgres user found for ${vendorEmail}`);

    const vendorRes = await client.query('SELECT id, store_name FROM vendors WHERE user_id = $1 LIMIT 1', [userRes.rows[0].id]);
    if (!vendorRes.rows[0]) throw new Error(`No vendor row found for user id ${userRes.rows[0].id}`);

    const vendorId = vendorRes.rows[0].id;
    const vendorName = vendorRes.rows[0].store_name || userRes.rows[0].name || 'Vendor';

    const demoProducts = [
      {
        id: `demo-product-${Date.now()}-1`,
        title: 'Demo Noise Cancelling Headphones',
        description: 'Premium wireless headphones with active noise cancellation.',
        price: 2499.0,
        category: 'electronics',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'],
        rating: 4.7,
      },
      {
        id: `demo-product-${Date.now()}-2`,
        title: 'Demo Smart Watch',
        description: 'Fitness tracking smartwatch with call and notification support.',
        price: 3999.0,
        category: 'electronics',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80'],
        rating: 4.5,
      },
      {
        id: `demo-product-${Date.now()}-3`,
        title: 'Demo Travel Backpack',
        description: 'Water-resistant travel backpack with laptop compartment.',
        price: 1299.0,
        category: 'fashion',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'],
        rating: 4.6,
      },
      {
        id: `demo-product-${Date.now()}-4`,
        title: 'Demo Desk Lamp',
        description: 'Minimal LED desk lamp for work and study setups.',
        price: 899.0,
        category: 'home',
        images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80'],
        rating: 4.4,
      },
    ].slice(0, productCount);

    let inserted = 0;
    for (const product of demoProducts) {
      await client.query(
        `INSERT INTO product_snapshots(
          product_mongo_id,
          title,
          description,
          price,
          currency,
          vendor_id,
          vendor_name,
          category,
          images,
          rating,
          updated_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
        ON CONFLICT (product_mongo_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          vendor_id = EXCLUDED.vendor_id,
          vendor_name = EXCLUDED.vendor_name,
          category = EXCLUDED.category,
          images = EXCLUDED.images,
          rating = EXCLUDED.rating,
          updated_at = now()`,
        [
          product.id,
          product.title,
          product.description,
          product.price,
          'INR',
          vendorId,
          vendorName,
          product.category,
          product.images,
          product.rating,
        ]
      );
      inserted += 1;
    }

    await client.query('COMMIT');
    console.log(`Inserted ${inserted} demo products for ${vendorEmail} (vendor_id=${vendorId})`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed vendor products failed:', err.message || err);
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
