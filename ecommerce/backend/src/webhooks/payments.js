const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

// Example payment webhook handler (e.g., Stripe/checkout webhook)
router.post('/', express.json(), async (req, res) => {
  const event = req.body;
  // event: { type, data: { object: {...} } }
  try {
    if (event.type === 'payment.succeeded' || event.type === 'payment_intent.succeeded') {
      const { order_id, transaction_id, amount } = event.data.object;
      await pool.query('UPDATE payments SET status=$1, transaction_id=$2 WHERE order_id=$3', ['succeeded', transaction_id, order_id]);
      // Mark outbox for post-payment actions
      await pool.query('INSERT INTO outbox(topic,payload) VALUES($1,$2)', ['payment.succeeded', { order_id, transaction_id, amount }]);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('webhook error', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
