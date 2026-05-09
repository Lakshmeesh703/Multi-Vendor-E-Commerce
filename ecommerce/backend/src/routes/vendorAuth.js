const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');
const { verifyVendor } = require('../middleware/roleAuth');
const { loginLimiter } = require('../middleware/rateLimiters');
const { signToken } = require('../utils/jwt');

const DEMO_LOGIN_ACCOUNTS = {
	'vendor@vendorhub.local': { role: 'vendor', name: 'Vendor', password: 'vendor123' },
};

let orderItemPriceColumnPromise = null;
let orderItemProductColumnPromise = null;
let orderItemSnapshotColumnPromise = null;

function safeNumber(value, fallback = 0) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function isValidImageUrl(url) {
	return /^(https?:\/\/).+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(String(url || '').trim());
}

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

router.post('/register', async (req, res) => {
	const { email, password, name, shopName } = req.body || {};
	const normalizedEmail = String(email || '').trim().toLowerCase();
	if (!normalizedEmail || !password || !name) {
		return res.status(400).json({ error: 'name,email,password required' });
	}

	try {
		const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
		if (existing.rows[0]?.id) return res.status(400).json({ error: 'Email already registered' });
		const userResult = await pool.query(
			'INSERT INTO users(name, email, password, role) VALUES($1,$2,$3,\'vendor\') RETURNING id,email,name,role',
			[name, normalizedEmail, password]
		);
		const user = userResult.rows[0];
		const vendorResult = await pool.query(
			"INSERT INTO vendors(user_id, store_name, store_description, approval_status) VALUES($1,$2,$3,'pending') RETURNING id",
			[user.id, shopName || name, '']
		);
		const token = signToken({ id: user.id, email: normalizedEmail, role: 'vendor' });
		res.status(201).json({ user: { id: user.id, email: user.email, name: user.name || name, role: 'vendor', vendorId: vendorResult.rows[0]?.id || null }, token });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post('/login', loginLimiter, async (req, res) => {
	const { email, password } = req.body || {};
	const normalizedEmail = String(email || '').trim().toLowerCase();
	if (!normalizedEmail || !password) return res.status(400).json({ error: 'email+password required' });

	const demo = DEMO_LOGIN_ACCOUNTS[normalizedEmail];
	if (demo && demo.password === password) {
		const userRecord = await pool.query('SELECT id, email, name FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
		const userId = userRecord.rows[0]?.id || null;
		if (!userId) {
			await ensurePgUserForVendor({ email: normalizedEmail, name: demo.name });
		}
		const refreshedUser = await pool.query('SELECT id, email, name FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
		const id = refreshedUser.rows[0]?.id || `demo-vendor`;
		const token = signToken({ id, email: normalizedEmail, role: 'vendor' });
		return res.json({ user: { id, email: normalizedEmail, name: refreshedUser.rows[0]?.name || demo.name, role: 'vendor' }, token });
	}
	return res.status(400).json({ error: 'Invalid credentials' });
});

async function ensurePgUserForVendor({ email, name }) {
	const normalizedEmail = String(email || '').trim().toLowerCase();
	if (!normalizedEmail) return null;

	const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
	if (existing.rows[0]?.id) return existing.rows[0].id;

	// We use Postgres as a relational backbone for orders/analytics.
	// Vendor auth is handled in Mongo for this project; create a minimal PG user row for linkage.
	const placeholderPassword = `external_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
	const insert = await pool.query(
		"INSERT INTO users(name, email, password, role) VALUES($1,$2,$3,'vendor') RETURNING id",
		[name || 'Vendor', normalizedEmail, placeholderPassword]
	);
	return insert.rows[0]?.id || null;
}

async function ensurePgVendorForUser({ userId, name }) {
	if (!userId) return null;
	const existing = await pool.query('SELECT id FROM vendors WHERE user_id = $1 LIMIT 1', [userId]);
	if (existing.rows[0]?.id) return existing.rows[0].id;

	const inserted = await pool.query(
		"INSERT INTO vendors(user_id, store_name, store_description, approval_status) VALUES($1,$2,$3,'approved') RETURNING id",
		[userId, name || 'Vendor', '']
	);
	return inserted.rows[0]?.id || null;
}

async function getOrderItemPriceColumn() {
	if (!orderItemPriceColumnPromise) {
		orderItemPriceColumnPromise = pool
			.query(
				`SELECT column_name
				 FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'order_items'
				   AND column_name IN ('unit_price', 'price')
				 ORDER BY CASE column_name WHEN 'unit_price' THEN 1 WHEN 'price' THEN 2 ELSE 3 END
				 LIMIT 1`
			)
			.then((result) => result.rows[0]?.column_name || null)
			.catch(() => null);
	}
	return orderItemPriceColumnPromise;
}

async function getOrderItemPriceExpression(alias = '') {
	const column = await getOrderItemPriceColumn();
	if (!column) return '0';
	const prefix = alias ? `${alias}.` : '';
	return `${prefix}${column}`;
}

async function getOrderItemProductExpression(alias = '') {
	if (!orderItemProductColumnPromise) {
		orderItemProductColumnPromise = pool
			.query(
				`SELECT column_name
				 FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'order_items'
				   AND column_name IN ('product_mongo_id', 'product_id')
				 ORDER BY CASE column_name WHEN 'product_mongo_id' THEN 1 WHEN 'product_id' THEN 2 ELSE 3 END
				 LIMIT 1`
			)
			.then((result) => result.rows[0]?.column_name || null)
			.catch(() => null);
	}
	const column = await orderItemProductColumnPromise;
	if (!column) return 'NULL';
	const prefix = alias ? `${alias}.` : '';
	return `${prefix}${column}`;
}

async function getOrderItemSnapshotExpression(alias = '') {
	if (!orderItemSnapshotColumnPromise) {
		orderItemSnapshotColumnPromise = pool
			.query(
				`SELECT column_name
				 FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'order_items'
				   AND column_name = 'product_snapshot'
				 LIMIT 1`
			)
			.then((result) => result.rows[0]?.column_name || null)
			.catch(() => null);
	}
	const column = await orderItemSnapshotColumnPromise;
	if (!column) return 'NULL::jsonb';
	const prefix = alias ? `${alias}.` : '';
	return `${prefix}${column}`;
}

async function resolveVendorRow(email) {
	const normalizedEmail = String(email || '').trim().toLowerCase();
	if (!normalizedEmail) return null;

	const result = await pool.query(
		`SELECT
			v.id AS vendor_id,
			v.user_id,
			v.store_name,
			v.store_description,
			v.approval_status,
			u.name,
			u.email
		 FROM vendors v
		 JOIN users u ON u.id = v.user_id
		 WHERE u.email = $1
		 LIMIT 1`,
		[normalizedEmail]
	);
	return result.rows[0] || null;
}

async function resolveVendorContext(req) {
	const vendorRow = await resolveVendorRow(req.user.email);
	const resolvedVendorName = vendorRow?.store_name || vendorRow?.name || req.user.email || 'vendor@vendorhub.local';
	const pgUserId = await ensurePgUserForVendor({ email: req.user.email, name: resolvedVendorName });
	const vendorId = await ensurePgVendorForUser({ userId: pgUserId, name: resolvedVendorName });
	return {
		pgUserId,
		vendorRow,
		vendorId,
		vendorName: resolvedVendorName,
	};
}

router.get('/summary', verifyVendor, async (req, res) => {
	try {
		const { vendorId, vendorName } = await resolveVendorContext(req);
		if (!vendorId) {
			return res.json({
				shopName: vendorName,
				products: 0,
				lowStock: 0,
				orders: 0,
				revenue: 0,
				recentProducts: [],
			});
		}

		const productFilter = { vendor_id: vendorId };
		const recentProductsRes = await pool.query(
			`SELECT
				product_mongo_id AS _id,
				title,
				category,
				price,
				currency,
				vendor_id,
				vendor_name,
				images,
				updated_at,
				created_at
			 FROM product_snapshots
			 WHERE vendor_id = $1
			 ORDER BY updated_at DESC NULLS LAST, created_at DESC
			 LIMIT 5`,
			[vendorId]
		);
		const productsRes = await pool.query('SELECT COUNT(*)::int AS count FROM product_snapshots WHERE vendor_id = $1', [vendorId]);
		const products = productsRes.rows[0]?.count || 0;
		const lowStock = 0;
		const recentProducts = recentProductsRes.rows.map((row) => ({
			_id: row._id,
			title: row.title,
			category: row.category,
			price: Number(row.price || 0),
			currency: row.currency || 'INR',
			vendor_id: row.vendor_id,
			vendor_name: row.vendor_name,
			images: Array.isArray(row.images) ? row.images : [],
			inventory: { sku: null, quantity: 0 },
			created_at: row.created_at,
			updated_at: row.updated_at,
		}));

		const ordersRes = vendorId
			? await pool.query('SELECT COUNT(*)::int AS count FROM order_items WHERE vendor_id = $1', [vendorId])
			: { rows: [{ count: 0 }] };
		const priceExpression = await getOrderItemPriceExpression();
		const revenueRes = vendorId
			? await pool.query(`SELECT COALESCE(SUM(${priceExpression} * quantity), 0)::numeric AS total FROM order_items WHERE vendor_id = $1`, [vendorId])
			: { rows: [{ total: 0 }] };

		res.json({
			shopName: vendorName,
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
		const { vendorId } = await resolveVendorContext(req);
		if (!vendorId) return res.json([]);
		const items = await pool.query(
			`SELECT
				product_mongo_id AS _id,
				title,
				description,
				category,
				price,
				currency,
				vendor_id,
				vendor_name,
				images,
				updated_at,
				created_at
			 FROM product_snapshots
			 WHERE vendor_id = $1
			 ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
			[vendorId]
		);
		res.json(items.rows.map((row) => ({
			_id: row._id,
			title: row.title,
			description: row.description || '',
			category: row.category || '',
			price: Number(row.price || 0),
			currency: row.currency || 'INR',
			vendor_id: row.vendor_id,
			vendor_name: row.vendor_name,
			images: Array.isArray(row.images) ? row.images : [],
			inventory: { sku: null, quantity: 0 },
			created_at: row.created_at,
			updated_at: row.updated_at,
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post('/products', verifyVendor, async (req, res) => {
	try {
		const { vendorId, vendorName } = await resolveVendorContext(req);
		if (!vendorId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });

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

		const imagesList = Array.isArray(images) ? images.map(String).map((url) => url.trim()).filter(Boolean) : [];
		if (imagesList.length > 5) {
			return res.status(400).json({ error: 'No more than 5 image URLs are allowed' });
		}
		if (imagesList.some((url) => !isValidImageUrl(url))) {
			return res.status(400).json({ error: 'Only valid image URLs are allowed (http/https with jpg, jpeg, png, webp, gif, avif).' });
		}

		const productId = String(req.body._id || req.body.product_mongo_id || crypto.randomUUID());
		const saved = await pool.query(
			`INSERT INTO product_snapshots(
				product_mongo_id,
				title,
				description,
				price,
				currency,
				vendor_id,
				vendor_name,
				category,
				images,
				updated_at
			) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
			ON CONFLICT (product_mongo_id) DO UPDATE SET
				title = EXCLUDED.title,
				description = EXCLUDED.description,
				price = EXCLUDED.price,
				currency = EXCLUDED.currency,
				vendor_id = EXCLUDED.vendor_id,
				vendor_name = EXCLUDED.vendor_name,
				category = EXCLUDED.category,
				images = EXCLUDED.images,
				updated_at = now()
			RETURNING product_mongo_id AS _id, title, description, category, price, currency, vendor_id, vendor_name, images, created_at, updated_at`,
			[productId, String(title), description ? String(description) : '', safeNumber(price, 0), currency ? String(currency) : 'INR', vendorId, vendorName, category ? String(category) : '', imagesList]
		);
		const row = saved.rows[0];
		res.status(201).json({
			_id: row._id,
			title: row.title,
			description: row.description || '',
			category: row.category || '',
			price: Number(row.price || 0),
			currency: row.currency || 'INR',
			vendor_id: row.vendor_id,
			vendor_name: row.vendor_name,
			images: Array.isArray(row.images) ? row.images : [],
			inventory: { sku: null, quantity: 0 },
			created_at: row.created_at,
			updated_at: row.updated_at,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.put('/products/:id', verifyVendor, async (req, res) => {
	try {
		const { vendorId } = await resolveVendorContext(req);
		if (!vendorId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });

		const id = req.params.id;
		const updates = { ...req.body };
		delete updates.vendor_id;
		const updated = await pool.query(
			`UPDATE product_snapshots
			 SET title = COALESCE($2, title),
				description = COALESCE($3, description),
				category = COALESCE($4, category),
				price = COALESCE($5, price),
				currency = COALESCE($6, currency),
				images = COALESCE($7, images),
				updated_at = now()
			 WHERE product_mongo_id = $1 AND vendor_id = $8
			 RETURNING product_mongo_id AS _id, title, description, category, price, currency, vendor_id, vendor_name, images, created_at, updated_at`,
			[
				id,
				updates.title ? String(updates.title) : null,
				updates.description ? String(updates.description) : null,
				updates.category ? String(updates.category) : null,
				updates.price !== undefined ? safeNumber(updates.price, 0) : null,
				updates.currency ? String(updates.currency) : null,
				Array.isArray(updates.images) ? updates.images.map(String) : null,
				vendorId,
			]
		);

		if (!updated.rows[0]) return res.status(404).json({ error: 'Not found or not owned' });
		res.json({
			_id: updated.rows[0]._id,
			title: updated.rows[0].title,
			description: updated.rows[0].description || '',
			category: updated.rows[0].category || '',
			price: Number(updated.rows[0].price || 0),
			currency: updated.rows[0].currency || 'INR',
			vendor_id: updated.rows[0].vendor_id,
			vendor_name: updated.rows[0].vendor_name,
			images: Array.isArray(updated.rows[0].images) ? updated.rows[0].images : [],
			inventory: { sku: null, quantity: 0 },
			created_at: updated.rows[0].created_at,
			updated_at: updated.rows[0].updated_at,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.delete('/products/:id', verifyVendor, async (req, res) => {
	try {
		const { vendorId } = await resolveVendorContext(req);
		if (!vendorId) return res.status(400).json({ error: 'Vendor account is not linked to Postgres yet' });
		const id = req.params.id;
		const r = await pool.query('DELETE FROM product_snapshots WHERE product_mongo_id = $1 AND vendor_id = $2', [id, vendorId]);
		res.json({ deleted: r.rowCount || 0 });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/orders', verifyVendor, async (req, res) => {
	try {
		const { vendorId } = await resolveVendorContext(req);
		if (!vendorId) return res.json({ orders: [] });

		const result = await pool.query(
			`SELECT
				oi.order_id,
				o.status,
				o.created_at,
				${await getOrderItemProductExpression('oi')} AS product_mongo_id,
				oi.quantity,
				${await getOrderItemPriceExpression('oi')} AS unit_price,
				${await getOrderItemSnapshotExpression('oi')} AS product_snapshot
			 FROM order_items oi
			 JOIN orders o ON o.id = oi.order_id
			 WHERE oi.vendor_id = $1
			 ORDER BY o.created_at DESC, oi.id ASC
			 LIMIT 200`,
			[vendorId]
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
		const { vendorId } = await resolveVendorContext(req);
		if (!vendorId) {
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

		const priceExpression = await getOrderItemPriceExpression();
		const productExpression = await getOrderItemProductExpression();
		const [totalsRes, byDayRes, topRes, productsCount, lowStockCount] = await Promise.all([
			pool.query(
				`SELECT
					COUNT(DISTINCT order_id)::int AS orders,
					COALESCE(SUM(${priceExpression} * quantity), 0)::numeric AS revenue,
					COALESCE(SUM(quantity), 0)::int AS units
				 FROM order_items
				 WHERE vendor_id = $1`,
				[vendorId]
			),
			(async () => {
				const aliasedPriceExpression = await getOrderItemPriceExpression('oi');
				return pool.query(
					`SELECT
						date_trunc('day', o.created_at) AS day,
						COUNT(DISTINCT oi.order_id)::int AS orders,
						COALESCE(SUM(${aliasedPriceExpression} * oi.quantity), 0)::numeric AS revenue
					 FROM order_items oi
					 JOIN orders o ON o.id = oi.order_id
					 WHERE oi.vendor_id = $1
						AND o.created_at >= (now() - interval '14 days')
					 GROUP BY 1
					 ORDER BY 1`,
					[vendorId]
				);
			})(),
			(async () => {
				const aliasedPriceExpression = await getOrderItemPriceExpression();
				return pool.query(
					`SELECT
						${productExpression} AS product_mongo_id,
						${await getOrderItemSnapshotExpression()} AS product_snapshot,
						COALESCE(${await getOrderItemSnapshotExpression()}->>'title', ${productExpression}) AS title,
						COALESCE(SUM(${aliasedPriceExpression} * quantity), 0)::numeric AS revenue,
						COALESCE(SUM(quantity), 0)::int AS units
					 FROM order_items
					 WHERE vendor_id = $1
					 GROUP BY 1,2
					 ORDER BY revenue DESC
					 LIMIT 5`,
					[vendorId]
				);
			})(),
			pool.query('SELECT COUNT(*)::int AS count FROM product_snapshots WHERE vendor_id = $1', [vendorId]),
			Promise.resolve({ rows: [{ count: 0 }] }),
		]);

		const orders = totalsRes.rows[0]?.orders || 0;
		const revenue = Number(totalsRes.rows[0]?.revenue || 0);
		const units = totalsRes.rows[0]?.units || 0;
		const avgOrderValue = orders > 0 ? Number((revenue / orders).toFixed(2)) : 0;

		res.json({
			products: productsCount.rows?.[0]?.count || 0,
			lowStock: lowStockCount.rows?.[0]?.count || 0,
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
