const express = require('express');
const { Pool } = require('pg');
const Product = require('../models/product_mongo');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const router = express.Router();

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

router.get('/', ensureToken, async (req, res) => {
  try {
    await ensureCart(req.cartToken);
    const r = await pool.query('SELECT product_mongo_id, quantity FROM cart_token_items WHERE cart_token=$1 ORDER BY created_at DESC', [req.cartToken]);
    const ids = r.rows.map(row => row.product_mongo_id);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const map = new Map(products.map(product => [String(product._id), product]));
    const items = r.rows.map(row => ({
      product_mongo_id: row.product_mongo_id,
      quantity: row.quantity,
      product: map.get(String(row.product_mongo_id)) || null,
    }));
    res.json({ cart_token: req.cartToken, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items', ensureToken, async (req, res) => {
  const { product_mongo_id, quantity = 1 } = req.body;
  const resolvedProductId = product_mongo_id || req.body.productId || req.body.id || req.query.product_mongo_id || req.query.productId;
  if (!resolvedProductId) return res.status(400).json({ error: 'product_mongo_id required' });
  try {
    await ensureCart(req.cartToken);
    await pool.query(
      `INSERT INTO cart_token_items(cart_token, product_mongo_id, quantity)
       VALUES($1,$2,$3)
       ON CONFLICT (cart_token, product_mongo_id)
       DO UPDATE SET quantity = cart_token_items.quantity + EXCLUDED.quantity`,
      [req.cartToken, String(resolvedProductId), Number(quantity)]
    );
    const snapshot = await pool.query('SELECT product_mongo_id, quantity FROM cart_token_items WHERE cart_token=$1', [req.cartToken]);
    res.json({ cart_token: req.cartToken, items: snapshot.rows });
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
    await pool.query('UPDATE cart_token_items SET quantity = 1 WHERE cart_token = $1', [req.cartToken]);
    const snapshot = await pool.query('SELECT product_mongo_id, quantity FROM cart_token_items WHERE cart_token=$1', [req.cartToken]);
    res.json({ cart_token: req.cartToken, items: snapshot.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
