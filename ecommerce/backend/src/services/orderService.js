// orderService: transactional Postgres order write with MongoDB product snapshots.
// The SQL order becomes the source of truth; Mongo only supplies catalog data.

const Product = require('../models/product_mongo');

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
      const product = await Product.findById(item.product_mongo_id).lean();
      if (!product) throw new Error('Product not found: ' + item.product_mongo_id);
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? product.price ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid quantity for ' + item.product_mongo_id);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid price for ' + item.product_mongo_id);
      total += unitPrice * quantity;
      enrichedItems.push({
        product,
        quantity,
        unitPrice,
        vendorId: item.vendor_id || product.vendor_id || null,
        snapshot: buildSnapshot(product, quantity, unitPrice),
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

    const inventoryUpdates = enrichedItems.map(item =>
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
