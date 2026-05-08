const express = require('express');
const { Pool } = require('pg');
const Product = require('../models/product_mongo');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const router = express.Router();

function ensureToken(req, res, next) {
  const token = req.headers['x-wishlist-token'] || req.query.wishlist_token;
  if (!token) return res.status(400).json({ error: 'Missing x-wishlist-token' });
  req.wishlistToken = String(token);
  next();
}

async function ensureWishlist(token) {
  await pool.query(
    'INSERT INTO wishlists(wishlist_token) VALUES($1) ON CONFLICT (wishlist_token) DO UPDATE SET updated_at = now()',
    [token]
  );
}

router.get('/', ensureToken, async (req, res) => {
  try {
    await ensureWishlist(req.wishlistToken);
    const r = await pool.query('SELECT product_mongo_id FROM wishlist_token_items WHERE wishlist_token=$1 ORDER BY created_at DESC', [req.wishlistToken]);
    const ids = r.rows.map(row => row.product_mongo_id);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const map = new Map(products.map(product => [String(product._id), product]));
    const items = r.rows.map(row => ({ product_mongo_id: row.product_mongo_id, product: map.get(String(row.product_mongo_id)) || null }));
    res.json({ wishlist_token: req.wishlistToken, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items', ensureToken, async (req, res) => {
  const { product_mongo_id } = req.body;
  const resolvedProductId = product_mongo_id || req.body.productId || req.body.id || req.query.product_mongo_id || req.query.productId;
  if (!resolvedProductId) return res.status(400).json({ error: 'product_mongo_id required' });
  try {
    await ensureWishlist(req.wishlistToken);
    await pool.query(
      `INSERT INTO wishlist_token_items(wishlist_token, product_mongo_id)
       VALUES($1,$2)
       ON CONFLICT (wishlist_token, product_mongo_id) DO NOTHING`,
      [req.wishlistToken, String(resolvedProductId)]
    );
    const snapshot = await pool.query('SELECT product_mongo_id FROM wishlist_token_items WHERE wishlist_token=$1', [req.wishlistToken]);
    res.json({ wishlist_token: req.wishlistToken, items: snapshot.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compatibility alias: POST /add used by older clients/tests
router.post('/add', ensureToken, async (req, res) => {
  const { product_mongo_id } = req.body;
  const resolvedProductId = product_mongo_id || req.body.productId || req.body.id || req.query.product_mongo_id || req.query.productId;
  if (!resolvedProductId) return res.status(400).json({ error: 'product_mongo_id required' });
  try {
    await ensureWishlist(req.wishlistToken);
    await pool.query(
      `INSERT INTO wishlist_token_items(wishlist_token, product_mongo_id)
       VALUES($1,$2)
       ON CONFLICT (wishlist_token, product_mongo_id) DO NOTHING`,
      [req.wishlistToken, String(resolvedProductId)]
    );
    const snapshot = await pool.query('SELECT product_mongo_id FROM wishlist_token_items WHERE wishlist_token=$1', [req.wishlistToken]);
    res.json({ wishlist_token: req.wishlistToken, items: snapshot.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/items/:productId', ensureToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM wishlist_token_items WHERE wishlist_token=$1 AND product_mongo_id=$2', [req.wishlistToken, String(req.params.productId)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
