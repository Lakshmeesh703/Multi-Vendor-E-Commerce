require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
});

async function testCart() {
  const token = `test-price-fix-${Date.now()}`;
  const productId = '60d5ec49c1234567890abcd1';
  
  try {
    console.log(`\n=== TESTING CART WITH PRICE ===`);
    console.log(`Token: ${token}`);
    console.log(`Product ID: ${productId}`);
    
    // Add item to cart
    const addUrl = 'http://localhost:4000/api/cart/items';
    const payload = {
      product_mongo_id: productId,
      quantity: 1,
      product_snapshot: {
        product_mongo_id: productId,
        title: 'Test Laptop Ultra',
        description: '16GB RAM • 1TB SSD',
        price: 74999,
        currency: 'INR',
        vendor_id: 1,
        vendor_name: 'TechZone',
        images: []
      }
    };
    
    console.log(`\nPOSTING to ${addUrl}`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));
    
    const addResp = await fetch(addUrl, {
      method: 'POST',
      headers: { 
        'x-cart-token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const addData = await addResp.json();
    console.log(`\nAdd response:`, JSON.stringify(addData, null, 2));
    
    // Fetch cart
    const getUrl = 'http://localhost:4000/api/cart';
    console.log(`\nGETTING from ${getUrl}`);
    
    const getResp = await fetch(getUrl, {
      headers: { 'x-cart-token': token }
    });
    
    const getData = await getResp.json();
    console.log(`\nFetch response:`, JSON.stringify(getData, null, 2));
    
    // Check database directly
    const dbResult = await pool.query(
      'SELECT * FROM cart_token_items WHERE cart_token = $1',
      [token]
    );
    
    console.log(`\nDatabase record:`, JSON.stringify(dbResult.rows, null, 2));
    
    const hasPrice = dbResult.rows.some(r => Number(r.unit_price) > 0);
    console.log(`\n✓ Price saved correctly: ${hasPrice ? 'YES' : 'NO'}`);
    
    process.exit(hasPrice ? 0 : 1);
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  }
}

testCart();
