const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const Customer = require('../models/Customer');
const { registerRole, loginRole } = require('../controllers/authController');
const { verifyCustomer } = require('../middleware/roleAuth');
const { loginLimiter } = require('../middleware/rateLimiters');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

router.post('/register', (req, res) => registerRole(req, res, Customer));
router.post('/login', loginLimiter, (req, res) => loginRole(req, res, Customer, 'customer'));

async function resolveCustomerContext(req) {
	const customerDoc = await Customer.findOne({ $or: [{ email: req.user.email }, { _id: req.user.id }] }).lean();
	const pgUser = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [req.user.email]);
	return {
		customerDoc,
		pgUserId: pgUser.rows[0]?.id || null,
	};
}

router.get('/summary', verifyCustomer, async (req, res) => {
	try {
		const { customerDoc, pgUserId } = await resolveCustomerContext(req);
		const ordersRes = pgUserId
			? await pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::numeric AS total FROM orders WHERE user_id = $1', [pgUserId])
			: { rows: [{ count: 0, total: 0 }] };
		const recentOrders = pgUserId
			? await pool.query('SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [pgUserId])
			: { rows: [] };

		res.json({
			name: customerDoc?.name || 'Customer',
			email: customerDoc?.email || req.user.email,
			address: customerDoc?.address || '',
			cartCount: Array.isArray(customerDoc?.cart) ? customerDoc.cart.length : 0,
			orderCount: ordersRes.rows[0].count,
			totalSpent: Number(ordersRes.rows[0].total || 0),
			recentOrders: recentOrders.rows,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/me', verifyCustomer, async (req, res) => {
	try {
		const customer = await Customer.findOne({ $or: [{ email: req.user.email }, { _id: req.user.id }] }).select('-password').lean();
		if (!customer) return res.status(404).json({ error: 'Customer not found' });
		res.json(customer);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Get customer orders
router.get('/orders', verifyCustomer, async (req, res) => {
	try {
		const { pgUserId } = await resolveCustomerContext(req);
		if (!pgUserId) return res.json({ orders: [] });
		const r = await pool.query('SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [pgUserId]);
		return res.json({ orders: r.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
