const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const Vendor = require('../models/Vendor');
const { registerRole, loginRole } = require('../controllers/authController');
const { verifyVendor } = require('../middleware/roleAuth');
const Product = require('../models/product_mongo');
const { loginLimiter } = require('../middleware/rateLimiters');

function safeNumber(value, fallback = 0) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

router.post('/register', (req, res) => registerRole(req, res, Vendor, { shopName: req.body.shopName || '' }));
router.post('/login', loginLimiter, (req, res) => loginRole(req, res, Vendor, 'vendor'));

async function ensurePgUserForVendor({ email, name }) {
	const normalizedEmail = String(email || '').trim().toLowerCase();
	if (!normalizedEmail) return null;

	const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
	if (existing.rows[0]?.id) return existing.rows[0].id;

	// We use Postgres as a relational backbone for orders/analytics.
	// Vendor auth is handled in Mongo for this project; create a minimal PG user row for linkage.
	const placeholderHash = `external_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
	const insert = await pool.query(
		"INSERT INTO users(email, password_hash, first_name, role) VALUES($1,$2,$3,'vendor') RETURNING id",
		[normalizedEmail, placeholderHash, name || null]
	);
	return insert.rows[0]?.id || null;
}

async function resolveVendorContext(req) {
	const vendorDoc = await Vendor.findOne({ $or: [{ email: req.user.email }, { _id: req.user.id }] }).lean();
	const pgUserId = await ensurePgUserForVendor({ email: req.user.email, name: vendorDoc?.name || vendorDoc?.shopName || null });
	return {
		vendorDoc,
		pgUserId,
	};
}

router.get('/summary', verifyVendor, async (req, res) => {
	try {
		const { vendorDoc, pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) {
			return res.json({
				shopName: vendorDoc?.shopName || vendorDoc?.name || 'Vendor',
				products: 0,
				lowStock: 0,
				orders: 0,
				revenue: 0,
				recentProducts: [],
			});
		}

		const productFilter = { vendor_id: pgUserId };
		const [products, lowStock, recentProducts] = await Promise.all([
			Product.countDocuments(productFilter),
			Product.countDocuments({ ...productFilter, 'inventory.quantity': { $lte: 10 } }),
			Product.find(productFilter).sort({ created_at: -1 }).limit(5).lean(),
		]);

		const ordersRes = pgUserId
			? await pool.query('SELECT COUNT(*)::int AS count FROM order_items WHERE vendor_id = $1', [pgUserId])
			: { rows: [{ count: 0 }] };
		const revenueRes = pgUserId
			? await pool.query('SELECT COALESCE(SUM(unit_price * quantity), 0)::numeric AS total FROM order_items WHERE vendor_id = $1', [pgUserId])
			: { rows: [{ total: 0 }] };

		res.json({
			shopName: vendorDoc?.shopName || vendorDoc?.name || 'Vendor',
			products,
			lowStock,
			orders: ordersRes.rows[0].count,
			revenue: Number(revenueRes.rows[0].total || 0),
			recentProducts,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/products', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) return res.json([]);
		const items = await Product.find({ vendor_id: pgUserId }).sort({ created_at: -1 }).lean();
		res.json(items);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post('/products', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });

		const {
			title,
			description,
			category,
			price,
			currency,
			attributes,
			images,
			inventory,
		} = req.body || {};

		if (!title || price === undefined || price === null) {
			return res.status(400).json({ error: 'title and price are required' });
		}

		const product = new Product({
			vendor_id: pgUserId,
			title: String(title),
			description: description ? String(description) : '',
			category: category ? String(category) : '',
			price: safeNumber(price, 0),
			currency: currency ? String(currency) : 'INR',
			attributes: attributes || {},
			images: Array.isArray(images) ? images.map(String) : [],
			inventory: {
				sku: inventory?.sku ? String(inventory.sku) : undefined,
				quantity: safeNumber(inventory?.quantity, 0),
			},
		});

		await product.save();
		res.status(201).json(product);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.put('/products/:id', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });

		const id = req.params.id;
		const updates = { ...req.body };
		delete updates.vendor_id;

		if (updates.price !== undefined) updates.price = safeNumber(updates.price, 0);
		if (updates.inventory?.quantity !== undefined) {
			updates.inventory = { ...updates.inventory, quantity: safeNumber(updates.inventory.quantity, 0) };
		}

		const updated = await Product.findOneAndUpdate(
			{ _id: id, vendor_id: pgUserId },
			{ $set: updates, updated_at: new Date() },
			{ new: true }
		).lean();

		if (!updated) return res.status(404).json({ error: 'Not found or not owned' });
		res.json(updated);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.delete('/products/:id', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });
		const id = req.params.id;
		const r = await Product.deleteOne({ _id: id, vendor_id: pgUserId }).exec();
		res.json({ deleted: r.deletedCount });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/orders', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) return res.json({ orders: [] });

		const result = await pool.query(
			`SELECT
				oi.order_id,
				o.status,
				o.created_at,
				oi.product_mongo_id,
				oi.quantity,
				oi.unit_price,
				oi.product_snapshot
			 FROM order_items oi
			 JOIN orders o ON o.id = oi.order_id
			 WHERE oi.vendor_id = $1
			 ORDER BY o.created_at DESC, oi.id ASC
			 LIMIT 200`,
			[pgUserId]
		);

		const map = new Map();
		for (const row of result.rows) {
			const key = String(row.order_id);
			if (!map.has(key)) {
				map.set(key, {
					order_id: row.order_id,
					status: row.status,
					created_at: row.created_at,
					items: [],
					total_amount: 0,
				});
			}
			const order = map.get(key);
			const snapshot = row.product_snapshot || {};
			const quantity = safeNumber(row.quantity, 0);
			const unitPrice = safeNumber(row.unit_price, 0);
			const lineTotal = Number((unitPrice * quantity).toFixed(2));
			order.total_amount = Number((order.total_amount + lineTotal).toFixed(2));
			order.items.push({
				product_mongo_id: row.product_mongo_id,
				title: snapshot.title || snapshot.name || row.product_mongo_id,
				quantity,
				unit_price: unitPrice,
				line_total: lineTotal,
			});
		}

		res.json({ orders: Array.from(map.values()) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/analytics', verifyVendor, async (req, res) => {
	try {
		const { pgUserId } = await resolveVendorContext(req);
		if (!pgUserId) {
			return res.json({
				products: 0,
				lowStock: 0,
				orders: 0,
				revenue: 0,
				units: 0,
				avgOrderValue: 0,
				revenueByDay: [],
				topProducts: [],
			});
		}

		const [totalsRes, byDayRes, topRes, productsCount, lowStockCount] = await Promise.all([
			pool.query(
				`SELECT
					COUNT(DISTINCT order_id)::int AS orders,
					COALESCE(SUM(unit_price * quantity), 0)::numeric AS revenue,
					COALESCE(SUM(quantity), 0)::int AS units
				 FROM order_items
				 WHERE vendor_id = $1`,
				[pgUserId]
			),
			pool.query(
				`SELECT
					date_trunc('day', o.created_at) AS day,
					COUNT(DISTINCT oi.order_id)::int AS orders,
					COALESCE(SUM(oi.unit_price * oi.quantity), 0)::numeric AS revenue
				 FROM order_items oi
				 JOIN orders o ON o.id = oi.order_id
				 WHERE oi.vendor_id = $1
					AND o.created_at >= (now() - interval '14 days')
				 GROUP BY 1
				 ORDER BY 1`,
				[pgUserId]
			),
			pool.query(
				`SELECT
					product_mongo_id,
					COALESCE(product_snapshot->>'title', product_mongo_id) AS title,
					COALESCE(SUM(unit_price * quantity), 0)::numeric AS revenue,
					COALESCE(SUM(quantity), 0)::int AS units
				 FROM order_items
				 WHERE vendor_id = $1
				 GROUP BY 1,2
				 ORDER BY revenue DESC
				 LIMIT 5`,
				[pgUserId]
			),
			Product.countDocuments({ vendor_id: pgUserId }),
			Product.countDocuments({ vendor_id: pgUserId, 'inventory.quantity': { $lte: 10 } }),
		]);

		const orders = totalsRes.rows[0]?.orders || 0;
		const revenue = Number(totalsRes.rows[0]?.revenue || 0);
		const units = totalsRes.rows[0]?.units || 0;
		const avgOrderValue = orders > 0 ? Number((revenue / orders).toFixed(2)) : 0;

		res.json({
			products: productsCount,
			lowStock: lowStockCount,
			orders,
			revenue,
			units,
			avgOrderValue,
			revenueByDay: byDayRes.rows.map(row => ({
				day: row.day,
				orders: row.orders,
				revenue: Number(row.revenue || 0),
			})),
			topProducts: topRes.rows.map(row => ({
				product_mongo_id: row.product_mongo_id,
				title: row.title,
				revenue: Number(row.revenue || 0),
				units: row.units,
			})),
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
