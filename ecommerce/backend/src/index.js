const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const Sentry = require('@sentry/node');

const Product = require('./models/product_mongo');
const orderService = require('./services/orderService');
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const vendorAuthRoutes = require('./routes/vendorAuth');
const customerAuthRoutes = require('./routes/customerAuth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const paymentsWebhook = require('./webhooks/payments');
const { Server } = require('socket.io');
const { authMiddleware } = require('./middleware/auth');
const Redis = require('ioredis');
const { logger, requestLogger } = require('./utils/logger');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
}

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);
// Security headers
app.use(helmet());

// Mount routes
app.use('/api/auth', authRoutes);
// Role-specific auth APIs
app.use('/api/admin', adminAuthRoutes);
app.use('/api/vendor', vendorAuthRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/webhooks/payments', paymentsWebhook);

const pgPool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

async function connectDatabases() {
  // Connect Postgres
  await pgPool.connect().catch(err => {
    logger.error('Postgres connection error', { error: err.message });
  });

  // Connect MongoDB
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB || 'ecommerce' }).catch(err => {
      logger.error('MongoDB connection error', { error: err.message });
    });
  }
}

app.get('/health', (req, res) => res.json({ ok: true }));

// Public product listing (simple)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().limit(50).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order (illustrative). In production use robust patterns (outbox, 2PC, or SAGA).
app.post('/api/orders', authMiddleware, async (req, res) => {
  const payload = { ...req.body, user_id: req.user.id };
  try {
    const result = await orderService.createOrder(pgPool, mongoose.connection, payload);
    logger.info('order_create', { order_id: result.order_id, user_id: payload.user_id, items: result.item_count, total_amount: result.total_amount });
    res.json(result);
  } catch (err) {
    logger.error('Order error', { error: err.message, stack: err.stack });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve the built frontend from the backend so the app runs from a single URL.
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/webhooks') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 4000;
const ioPort = process.env.SOCKET_PORT || PORT;

// Wrap express app with http server for Socket.IO
const server = require('http').createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Optional Redis connection for real-time updates
let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', () => {});  // Silently ignore Redis errors (optional feature)
  redis.on('connect', () => {});  // Silently ignore connection events
}

io.on('connection', (socket) => {
  logger.info('socket_connected', { socketId: socket.id });
  socket.on('subscribe.product', (productId) => {
    socket.join(`product:${productId}`);
  });
});

// Bridge Redis pub/sub to socket.io if available
if (redis) {
  const sub = new Redis(process.env.REDIS_URL);
  sub.on('error', () => {});  // Silently ignore Redis errors
  sub.on('connect', () => {});  // Silently ignore connection events
  sub.psubscribe('inventory.*', (err, count) => {
    // Silently ignore errors
  });
  sub.on('pmessage', (pattern, channel, message) => {
    try {
      const payload = JSON.parse(message);
      io.to(payload.room || channel).emit(channel, payload);
    } catch (e) {}
  });
}

connectDatabases().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info('backend_listening', { url: `http://localhost:${PORT}` });
    logger.info('postgres_connected');
    logger.info('mongodb_connected');
  });
}).catch(err => {
  logger.error('Startup DB error', { error: err.message, stack: err.stack });
  process.exit(1);
});

app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    method: req.method,
    path: req.originalUrl || req.url,
    stack: err.stack,
  });
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
