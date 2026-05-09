const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const Admin = require('../models/Admin');
const { registerRole, loginRole } = require('../controllers/authController');
const { verifyAdmin } = require('../middleware/roleAuth');
const { loginLimiter } = require('../middleware/rateLimiters');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

router.post('/register', (req, res) => registerRole(req, res, Admin));
router.post('/login', loginLimiter, (req, res) => loginRole(req, res, Admin, 'admin'));

router.get('/summary', verifyAdmin, async (req, res) => {
	try {
		const [usersRes, vendorsRes, ordersRes, salesRes, pendingVendorsRes, productsRes, dbRes] = await Promise.all([
			pool.query('SELECT COUNT(*)::int AS count FROM users'),
			pool.query('SELECT COUNT(*)::int AS count FROM vendors'),
			pool.query('SELECT COUNT(*)::int AS count FROM orders'),
			pool.query('SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM orders'),
			pool.query("SELECT COUNT(*)::int AS count FROM vendors WHERE approval_status = 'pending'"),
			pool.query('SELECT COUNT(*)::int AS count FROM product_snapshots'),
			// database info: name and human-readable size
			pool.query("SELECT current_database() AS name, pg_size_pretty(pg_database_size(current_database())) AS size"),
		]);

		res.json({
			users: usersRes.rows[0].count,
			vendors: vendorsRes.rows[0].count,
			orders: ordersRes.rows[0].count,
			totalSales: Number(salesRes.rows[0].total || 0),
			dbName: dbRes?.rows?.[0]?.name || null,
			dbSize: dbRes?.rows?.[0]?.size || null,
			pendingVendors: pendingVendorsRes.rows[0].count,
			products: productsRes.rows[0].count,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/vendors/pending', verifyAdmin, async (req, res) => {
	try {
		const result = await pool.query(
			"SELECT id, user_id, store_name AS name, store_description AS description, approval_status, created_at FROM vendors WHERE approval_status = 'pending' ORDER BY created_at DESC"
		);
		res.json(result.rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post('/vendors/:vendorId/approve', verifyAdmin, async (req, res) => {
	try {
		const result = await pool.query(
			"UPDATE vendors SET approval_status = 'approved' WHERE id = $1 RETURNING id",
			[req.params.vendorId]
		);
		if (!result.rows[0]) return res.status(404).json({ error: 'Vendor not found' });
		res.json({ ok: true, vendorId: result.rows[0].id });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post('/vendors/:vendorId/reject', verifyAdmin, async (req, res) => {
	try {
		const result = await pool.query(
			"UPDATE vendors SET approval_status = 'rejected' WHERE id = $1 RETURNING id",
			[req.params.vendorId]
		);
		if (!result.rows[0]) return res.status(404).json({ error: 'Vendor not found' });
		res.json({ ok: true, vendorId: result.rows[0].id });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
