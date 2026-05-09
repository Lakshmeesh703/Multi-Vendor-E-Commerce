const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const router = express.Router();

function normalizeSnapshot(snapshot) {
  if (!snapshot) return null;
  if (typeof snapshot === 'string') {
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  }
  if (typeof snapshot === 'object') return snapshot;
  return null;
}

async function getSnapshotFromCatalog(productId) {
  const result = await pool.query(
    `SELECT product_mongo_id, title, description, price, currency, vendor_id, vendor_name, category, images, rating
     FROM product_snapshots
     WHERE product_mongo_id = $1
     LIMIT 1`,
    [String(productId)]
  );
  return result.rows[0] || null;
}

function toCartItem(row) {
  const snapshot = normalizeSnapshot(row.product_snapshot);
  const product = snapshot
    ? {
        _id: snapshot.product_mongo_id || row.product_mongo_id,
        title: snapshot.title || 'Product',
        description: snapshot.description || '',
        price: Number(snapshot.price ?? row.unit_price ?? 0),
        vendor_id: snapshot.vendor_id ?? null,
        vendor_name: snapshot.vendor_name || '',
        category: snapshot.category || '',
        currency: (snapshot.currency || 'INR').toUpperCase(),
        images: Array.isArray(snapshot.images) ? snapshot.images : [],
        rating: Number(snapshot.rating || 0),
      }
    : null;

  const unitPrice = Number(row.unit_price ?? snapshot?.price ?? product?.price ?? 0);
  const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? Number(unitPrice.toFixed(2)) : 0;

  return {
    product_mongo_id: row.product_mongo_id,
    quantity: Number(row.quantity || 0),
    unit_price: safeUnitPrice,
    currency: (snapshot?.currency || product?.currency || 'INR').toUpperCase(),
    product,
  };
}

function ensureToken(req, res, next) {
  const token = req.headers['x-cart-token'] || req.query.cart_token;
  if (!token) return res.status(400).json({ error: 'Missing x-cart-token' });
  req.cartToken = String(token);
  next();
}

async function ensureCart(token) {
  await pool.query(
    'INSERT INTO carts(cart_token) VALUES($1) ON CONFLICT (cart_token) DO UPDATE SET updated_at = now()',
    [token]
  );
}

// Ensure cart_token_items table has required columns
async function ensureCartTableSchema() {
  try {
    // Try to add unit_price column if it doesn't exist
    await pool.query(
      `ALTER TABLE cart_token_items 
       ADD COLUMN unit_price NUMERIC(12,2) DEFAULT 0`
    ).catch(() => {}); // Ignore if column already exists
    
    // Try to add product_snapshot column if it doesn't exist
    await pool.query(
      `ALTER TABLE cart_token_items 
       ADD COLUMN product_snapshot JSONB`
    ).catch(() => {}); // Ignore if column already exists
  } catch (err) {
    // Schema already up to date, continue
  }
}

router.get('/', ensureToken, async (req, res) => {
  try {
    await ensureCart(req.cartToken);
    await ensureCartTableSchema();
    
    const r = await pool.query(
      `SELECT product_mongo_id, quantity, COALESCE(unit_price, 0) as unit_price, product_snapshot 
       FROM cart_token_items 
       WHERE cart_token=$1 
       ORDER BY created_at DESC`,
      [req.cartToken]
    );
    
    const items = r.rows.map(toCartItem);
    
    res.json({ cart_token: req.cartToken, items });
  } catch (err) {
    res.json({ cart_token: req.cartToken, items: [] });
  }
});

router.post('/items', ensureToken, async (req, res) => {
  const { product_mongo_id, quantity = 1, product_snapshot } = req.body;
  const resolvedProductId = product_mongo_id || req.body.productId || req.body.id || req.query.product_mongo_id || req.query.productId;
  if (!resolvedProductId) return res.status(400).json({ error: 'product_mongo_id required' });
  
  try {
    await ensureCart(req.cartToken);
    await ensureCartTableSchema();
    
    let snapshot = normalizeSnapshot(product_snapshot);
    if (!snapshot) {
      const catalogRow = await getSnapshotFromCatalog(resolvedProductId);
      if (catalogRow) {
        snapshot = {
          product_mongo_id: String(catalogRow.product_mongo_id),
          title: catalogRow.title || 'Product',
          description: catalogRow.description || '',
          price: Number(catalogRow.price || 0),
          currency: catalogRow.currency || 'INR',
          vendor_id: catalogRow.vendor_id || null,
          vendor_name: catalogRow.vendor_name || '',
          category: catalogRow.category || '',
          images: Array.isArray(catalogRow.images) ? catalogRow.images : [],
          rating: Number(catalogRow.rating || 0),
        };
      }
    }
    const unitPrice = Number(snapshot?.price || 0);
    const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? Number(unitPrice.toFixed(2)) : 0;
    
    // Insert/update cart item with snapshot in Postgres
    await pool.query(
      `INSERT INTO cart_token_items(cart_token, product_mongo_id, quantity, unit_price, product_snapshot)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (cart_token, product_mongo_id)
       DO UPDATE SET quantity = cart_token_items.quantity + EXCLUDED.quantity,
                     unit_price = EXCLUDED.unit_price,
                     product_snapshot = EXCLUDED.product_snapshot`,
      [
        req.cartToken,
        String(resolvedProductId),
        Number(quantity),
        safeUnitPrice,
        snapshot ? JSON.stringify(snapshot) : null,
      ]
    ).catch(async (err) => {
      // If columns don't exist, try without them
      if (err.message.includes('unit_price') || err.message.includes('product_snapshot')) {
        await pool.query(
          `INSERT INTO cart_token_items(cart_token, product_mongo_id, quantity)
           VALUES($1,$2,$3)
           ON CONFLICT (cart_token, product_mongo_id)
           DO UPDATE SET quantity = cart_token_items.quantity + EXCLUDED.quantity`,
          [req.cartToken, String(resolvedProductId), Number(quantity)]
        );
      } else {
        throw err;
      }
    });
    
    const result = await pool.query(
      `SELECT product_mongo_id, quantity, COALESCE(unit_price, 0) as unit_price, product_snapshot 
       FROM cart_token_items 
       WHERE cart_token=$1`,
      [req.cartToken]
    );
    
    res.json({ cart_token: req.cartToken, items: result.rows.map(toCartItem) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/items/:productId', ensureToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_token_items WHERE cart_token=$1 AND product_mongo_id=$2', [req.cartToken, String(req.params.productId)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cleanup', ensureToken, async (req, res) => {
  try {
    await ensureCart(req.cartToken);
    await ensureCartTableSchema();
    await pool.query('UPDATE cart_token_items SET quantity = 1 WHERE cart_token = $1', [req.cartToken]);
    const result = await pool.query(
      'SELECT product_mongo_id, quantity, unit_price, product_snapshot FROM cart_token_items WHERE cart_token=$1',
      [req.cartToken]
    );
    res.json({ cart_token: req.cartToken, items: result.rows.map(toCartItem) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
