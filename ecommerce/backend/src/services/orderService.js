// orderService: transactional Postgres order write with MongoDB product snapshots.
// The SQL order becomes the source of truth; Mongo only supplies catalog data.

const Product = require('../models/product_mongo');
const mongoose = require('mongoose');

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

function mapSnapshotToProduct(source, fallbackId) {
  if (!source) return null;
  return {
    _id: String(source.product_mongo_id || source._id || fallbackId || ''),
    title: source.title || 'Product',
    description: source.description || '',
    category: source.category || '',
    vendor_id: source.vendor_id || null,
    currency: source.currency || 'INR',
    attributes: source.attributes || {},
    inventory: source.inventory || {},
    price: Number(source.price || 0),
    images: Array.isArray(source.images) ? source.images : [],
  };
}

function buildSnapshot(product, quantity, resolvedPrice) {
  return {
    product_mongo_id: String(product._id),
    title: product.title,
    description: product.description || '',
    category: product.category || '',
    vendor_id: product.vendor_id || null,
    currency: product.currency || 'INR',
    attributes: product.attributes || {},
    inventory: product.inventory || {},
    quantity,
    unit_price: resolvedPrice,
  };
}

async function createOrder(pgPool, mongoConn, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw new Error('At least one order item is required');

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const productId = String(item.product_mongo_id || '').trim();
      if (!productId) throw new Error('product_mongo_id is required');

      let product = null;
      let productSource = 'none';

      const snapshotRes = await client.query(
        `SELECT product_mongo_id, title, description, category, vendor_id, currency, price, images
         FROM product_snapshots
         WHERE product_mongo_id = $1
         LIMIT 1`,
        [productId]
      );
      if (snapshotRes.rows[0]) {
        product = mapSnapshotToProduct(snapshotRes.rows[0], productId);
        productSource = 'postgres';
      }

      if (!product) {
        const payloadSnapshot = normalizeSnapshot(item.product_snapshot);
        if (payloadSnapshot) {
          product = mapSnapshotToProduct(payloadSnapshot, productId);
          productSource = 'payload';
        }
      }

      if (!product && mongoose.Types.ObjectId.isValid(productId)) {
        product = await Product.findById(productId).lean();
        if (product) productSource = 'mongo';
      }

      if (!product) throw new Error('Product not found: ' + productId);

      const quantity = Number(item.quantity || 1);
      const dbPrice = Number(product.price);
      const requestPrice = Number(item.unit_price);
      const unitPrice = Number.isFinite(dbPrice) && dbPrice > 0
        ? dbPrice
        : (Number.isFinite(requestPrice) && requestPrice > 0 ? requestPrice : NaN);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid quantity for ' + productId);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Invalid price for ' + productId);
      total += unitPrice * quantity;
      enrichedItems.push({
        product,
        quantity,
        unitPrice,
        vendorId: item.vendor_id || product.vendor_id || null,
        snapshot: buildSnapshot(product, quantity, unitPrice),
        source: productSource,
      });
    }

    const orderRes = await client.query(
      'INSERT INTO orders(user_id, total_amount, status, shipping_address_id) VALUES($1,$2,$3,$4) RETURNING id',
      [payload.user_id, total, payload.status || 'pending', payload.shipping_address_id || null]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of enrichedItems) {
      await client.query(
        `INSERT INTO order_items(order_id, vendor_id, product_mongo_id, product_snapshot, quantity, unit_price, tax_amount)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [orderId, item.vendorId, String(item.product._id), JSON.stringify(item.snapshot), item.quantity, item.unitPrice, 0]
      );

      await client.query(
        `INSERT INTO commissions(order_id, vendor_id, commission_amount)
         VALUES($1,$2,$3)`,
        [orderId, item.vendorId, Number((item.unitPrice * item.quantity * 0.1).toFixed(2))]
      );
    }

    await client.query(
      `INSERT INTO payments(order_id, amount, currency, payment_method, status, transaction_id)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [orderId, total, payload.currency || 'INR', payload.payment_method || 'card', 'initiated', payload.transaction_id || null]
    );

    await client.query('COMMIT');

    const inventoryUpdates = enrichedItems
      .filter((item) => item.source === 'mongo' && mongoose.Types.ObjectId.isValid(String(item.product?._id || '')))
      .map((item) =>
        Product.updateOne(
          { _id: item.product._id, 'inventory.quantity': { $gte: item.quantity } },
          { $inc: { 'inventory.quantity': -item.quantity } }
        ).exec()
      );
    await Promise.all(inventoryUpdates);

    return {
      order_id: orderId,
      status: 'created',
      total_amount: Number(total.toFixed(2)),
      item_count: enrichedItems.length,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createOrder };
