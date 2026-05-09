require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
});

(async () => {
  try {
    const r = await pool.query('DELETE FROM cart_token_items WHERE unit_price = 0');
    console.log('✓ Deleted', r.rowCount, 'items with 0 price');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
