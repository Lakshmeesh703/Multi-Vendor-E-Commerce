require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
});

async function checkAndFixCart() {
  try {
    // Check columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cart_token_items' 
      ORDER BY column_name
    `);
    
    console.log('=== CURRENT COLUMNS IN cart_token_items ===');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Check if required columns exist
    const columnNames = result.rows.map(r => r.column_name);
    const missingColumns = [];
    
    if (!columnNames.includes('unit_price')) missingColumns.push('unit_price');
    if (!columnNames.includes('product_snapshot')) missingColumns.push('product_snapshot');
    
    if (missingColumns.length > 0) {
      console.log('\n⚠ MISSING COLUMNS:', missingColumns.join(', '));
      console.log('\nAdding missing columns...');
      
      for (const col of missingColumns) {
        try {
          if (col === 'unit_price') {
            await pool.query(`ALTER TABLE cart_token_items ADD COLUMN unit_price NUMERIC(12,2) DEFAULT 0`);
            console.log('✓ Added unit_price column');
          } else if (col === 'product_snapshot') {
            await pool.query(`ALTER TABLE cart_token_items ADD COLUMN product_snapshot JSONB`);
            console.log('✓ Added product_snapshot column');
          }
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('✗ Error adding column:', err.message);
          }
        }
      }
    } else {
      console.log('\n✓ All required columns exist!');
    }
    
    // Check sample data
    console.log('\n=== SAMPLE CART DATA ===');
    const dataResult = await pool.query('SELECT * FROM cart_token_items LIMIT 5');
    if (dataResult.rows.length === 0) {
      console.log('  (no items in cart)');
    } else {
      console.log(`Found ${dataResult.rows.length} items:`);
      dataResult.rows.forEach(row => {
        console.log(`  - Cart: ${row.cart_token}, Product: ${row.product_mongo_id}, Qty: ${row.quantity}, Price: ${row.unit_price}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

checkAndFixCart();
