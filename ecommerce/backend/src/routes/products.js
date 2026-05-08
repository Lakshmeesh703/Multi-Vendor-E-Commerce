const express = require('express');
const Product = require('../models/product_mongo');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const router = express.Router();

// Public listing with filters
router.get('/', async (req, res) => {
  const { category, vendor_id, q, min_price, max_price, min_rating, sort } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (vendor_id) filter.vendor_id = Number(vendor_id);
  if (q) filter.$text = { $search: q };
  if (min_price || max_price) {
    filter.price = {};
    if (min_price) filter.price.$gte = Number(min_price);
    if (max_price) filter.price.$lte = Number(max_price);
  }
  if (min_rating) filter.rating = { $gte: Number(min_rating) };
  try {
    let query = Product.find(filter).limit(100).lean();
    if (sort === 'price_low') query = query.sort({ price: 1 });
    if (sort === 'price_high') query = query.sort({ price: -1 });
    if (sort === 'rating') query = query.sort({ rating: -1 });
    const products = await query;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: create product
router.post('/', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  const body = req.body;
  try {
    const p = new Product({ ...body, vendor_id: req.user.id });
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: update product
router.put('/:id', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Product.findOneAndUpdate({ _id: id, vendor_id: req.user.id }, req.body, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: 'Not found or not owned' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor: delete product
router.delete('/:id', authMiddleware, requireRole('vendor','admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const r = await Product.deleteOne({ _id: id, vendor_id: req.user.id }).exec();
    res.json({ deleted: r.deletedCount });
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
