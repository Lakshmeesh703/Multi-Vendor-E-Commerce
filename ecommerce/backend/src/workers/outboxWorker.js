const { Pool } = require('pg');
const axios = require('axios');
const Redis = require('ioredis');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function processOutbox(){
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT id,topic,payload FROM outbox WHERE processed=false ORDER BY id LIMIT 10');
    for (const row of r.rows) {
      try {
        // For demo: publish to Redis channel
        await redis.publish(`outbox.${row.topic}`, JSON.stringify(row.payload));
        await client.query('UPDATE outbox SET processed=true, processed_at=now() WHERE id=$1', [row.id]);
      } catch (err) {
        console.error('outbox item failed', row.id, err.message);
      }
    }
  } finally { client.release(); }
}

async function run(){
  console.log('Outbox worker started');
  while (true) {
    try { await processOutbox(); } catch(e){ console.error('processOutbox error', e.message); }
    await new Promise(r => setTimeout(r, 2000));
  }
}

if (require.main === module) run();

module.exports = { processOutbox };
