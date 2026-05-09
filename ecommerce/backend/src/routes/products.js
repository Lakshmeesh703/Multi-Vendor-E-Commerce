const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const router = express.Router();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeImages(images) {
  if (Array.isArray(images)) return images.map(String);
  if (typeof images === 'string' && images.trim()) return images.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function mapProductRow(row) {
  return {
    _id: row.product_mongo_id,
    id: row.product_mongo_id,
    product_mongo_id: row.product_mongo_id,
    title: row.title,
    description: row.description || '',
    category: row.category || '',
    price: toNumber(row.price, 0),
    currency: String(row.currency || 'INR').toUpperCase(),
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name || '',
    images: Array.isArray(row.images) ? row.images : [],
    rating: toNumber(row.rating, 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Public listing with filters
router.get('/', async (req, res) => {
  const { category, vendor_id, q, min_price, max_price, min_rating, sort } = req.query;
  try {
    const conditions = [];
    const params = [];
    const pushCondition = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace('$', `$${params.length}`));
    };

    if (category) pushCondition('category ILIKE $', `%${category}%`);
    if (vendor_id) pushCondition('vendor_id = $', Number(vendor_id));
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx} OR vendor_name ILIKE $${idx})`);
    }
    if (min_price) pushCondition('price >= $', Number(min_price));
    if (max_price) pushCondition('price <= $', Number(max_price));
    if (min_rating) pushCondition('rating >= $', Number(min_rating));

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    let orderClause = 'ORDER BY updated_at DESC NULLS LAST, created_at DESC';
    if (sort === 'price_low') orderClause = 'ORDER BY price ASC, updated_at DESC NULLS LAST';
    if (sort === 'price_high') orderClause = 'ORDER BY price DESC, updated_at DESC NULLS LAST';
    if (sort === 'rating') orderClause = 'ORDER BY rating DESC, updated_at DESC NULLS LAST';

    const r = await pool.query(
      `SELECT product_mongo_id, title, description, category, price, currency, vendor_id, vendor_name, images, rating, created_at, updated_at
       FROM product_snapshots
       ${whereClause}
       ${orderClause}
       LIMIT 100`,
      params
    );
    res.json(r.rows.map(mapProductRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: create product
router.post('/', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  const body = req.body;
  try {
    const productId = String(body._id || body.product_mongo_id || crypto.randomUUID());
    const r = await pool.query(
      `INSERT INTO product_snapshots(product_mongo_id, title, description, price, currency, vendor_id, vendor_name, category, images, rating, updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
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
         updated_at = now()
       RETURNING product_mongo_id, title, description, category, price, currency, vendor_id, vendor_name, images, rating, created_at, updated_at`,
      [
        productId,
        body.title,
        body.description || '',
        toNumber(body.price, 0),
        body.currency || 'INR',
        Number(req.user.id),
        body.vendor_name || body.vendorName || 'Vendor',
        body.category || '',
        normalizeImages(body.images),
        toNumber(body.rating, 0),
      ]
    );
    res.json(mapProductRow(r.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: update product
router.put('/:id', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await pool.query(
      `UPDATE product_snapshots
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           category = COALESCE($4, category),
           price = COALESCE($5, price),
           currency = COALESCE($6, currency),
           images = COALESCE($7, images),
           rating = COALESCE($8, rating),
           updated_at = now()
       WHERE product_mongo_id = $1 AND vendor_id = $9
       RETURNING product_mongo_id, title, description, category, price, currency, vendor_id, vendor_name, images, rating, created_at, updated_at`,
      [
        id,
        body.title ?? null,
        body.description ?? null,
        body.category ?? null,
        body.price !== undefined ? toNumber(body.price, 0) : null,
        body.currency ?? null,
        body.images ? normalizeImages(body.images) : null,
        body.rating !== undefined ? toNumber(body.rating, 0) : null,
        Number(req.user.id),
      ]
    );
    if (!updated.rows[0]) return res.status(404).json({ error: 'Not found or not owned' });
    res.json(mapProductRow(updated.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: delete product
router.delete('/:id', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query('DELETE FROM product_snapshots WHERE product_mongo_id = $1 AND vendor_id = $2', [id, Number(req.user.id)]);
    res.json({ deleted: r.rowCount || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attribute templates CRUD (Postgres-backed)
router.get('/templates', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,category,template FROM attribute_templates ORDER BY id DESC LIMIT 50');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/templates', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, category, template } = req.body;
    const r = await pool.query('INSERT INTO attribute_templates(name,category,template) VALUES($1,$2,$3) RETURNING id', [name,category,template]);
    res.json({ id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
