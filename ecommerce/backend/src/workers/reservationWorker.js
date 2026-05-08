const mongoose = require('mongoose');
const Product = require('../models/product_mongo');
const { Pool } = require('pg');
const Redis = require('ioredis');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Process inventory_reservations table and sync to MongoDB inventory
async function processReservations(){
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT id,order_id,product_mongo_id,quantity,status FROM inventory_reservations WHERE status='reserved' ORDER BY created_at LIMIT 20");
    for (const row of r.rows) {
      try {
        const res = await Product.updateOne({ _id: row.product_mongo_id, 'inventory.quantity': { $gte: row.quantity } }, { $inc: { 'inventory.quantity': -row.quantity } }).exec();
        if (res.modifiedCount || res.nModified || res.matchedCount) {
          await client.query("UPDATE inventory_reservations SET status='committed' WHERE id=$1", [row.id]);
          // publish inventory update
          await redis.publish(`inventory.product`, JSON.stringify({ product_id: row.product_mongo_id, qty: row.quantity, order_id: row.order_id }));
        } else {
          await client.query("UPDATE inventory_reservations SET status='released' WHERE id=$1", [row.id]);
        }
      } catch (err) { console.error('reservation process error', err.message); }
    }
  } finally { client.release(); }
}

async function run(){
  console.log('Reservation worker started');
  while (true){
    try { await processReservations(); } catch(e){ console.error(e.message); }
    await new Promise(r => setTimeout(r, 2000));
  }
}

if (require.main === module) run();

module.exports = { processReservations };
