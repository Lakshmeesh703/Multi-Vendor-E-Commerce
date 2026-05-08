const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');
const router = express.Router();
const { signToken, signRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiters');
const { logger } = require('../utils/logger');
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL });

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function extractRefreshToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getRoleModel(role) {
  if (role === 'admin') return Admin;
  if (role === 'vendor') return Vendor;
  return Customer;
}

function signResetToken(payload) {
  return require('jsonwebtoken').sign(
    payload,
    process.env.JWT_RESET_SECRET || `${process.env.JWT_SECRET || 'dev_secret'}_reset`,
    { expiresIn: process.env.JWT_RESET_EXPIRES_IN || '15m' }
  );
}

function verifyResetToken(token) {
  try {
    return require('jsonwebtoken').verify(
      token,
      process.env.JWT_RESET_SECRET || `${process.env.JWT_SECRET || 'dev_secret'}_reset`
    );
  } catch {
    return null;
  }
}

async function upsertMongoRoleUser(role, payload) {
  const Model = getRoleModel(role);
  const existing = await Model.findOne({ email: payload.email });
  if (existing) {
    existing.name = payload.name || existing.name;
    existing.password = payload.password || existing.password;
    existing.role = role;
    if (role === 'vendor' && payload.shopName) existing.shopName = payload.shopName;
    await existing.save();
    return existing;
  }

  const doc = new Model({
    name: payload.name || payload.email.split('@')[0],
    email: payload.email,
    password: payload.password,
    role,
    shopName: payload.shopName || '',
    gstNumber: payload.gstNumber || '',
    phone: payload.phone || '',
    address: payload.address || '',
    cart: [],
    orders: [],
  });
  await doc.save();
  return doc;
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users(email,password,name,role) VALUES($1,$2,$3,$4) RETURNING id,email,role',
      [email, hash, name || email.split('@')[0], 'customer']
    );
    const user = result.rows[0];
    const userPayload = { id: user.id, email: user.email, role: user.role };
    const token = signToken(userPayload);
    const refreshToken = signRefreshToken(userPayload);
    res.cookie('refresh_token', refreshToken, cookieOptions());
    res.status(201).json({ user, token });
  } catch (err) {
    logger.error('register_error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });

  try {
    const result = await pool.query(
      'SELECT id,email,password,role FROM users WHERE (email=$1 OR name=$1) AND role = $2',
      [email, 'customer']
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const userPayload = { id: user.id, email: user.email, role: user.role };
    const token = signToken(userPayload);
    const refreshToken = signRefreshToken(userPayload);
    res.cookie('refresh_token', refreshToken, cookieOptions());
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    logger.error('login_error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  if (!refreshToken) return res.status(401).json({ error: 'Missing refresh token' });
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid refresh token' });

  const token = signToken({ id: payload.id, email: payload.email, role: payload.role });
  const nextRefreshToken = signRefreshToken({ id: payload.id, email: payload.email, role: payload.role });
  res.cookie('refresh_token', nextRefreshToken, cookieOptions());
  return res.json({ token, user: { id: payload.id, email: payload.email, role: payload.role } });
});

router.post('/logout', async (req, res) => {
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ ok: true });
});

router.post('/password/forgot', async (req, res) => {
  const { email, role = 'customer' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const user = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1 LIMIT 1', [email]);
    const roleUser = await getRoleModel(role).findOne({ email }).lean();
    if (user.rows.length === 0 && !roleUser) return res.status(404).json({ error: 'User not found' });

    const resetToken = signResetToken({
      email,
      role,
      id: user.rows[0]?.id || roleUser?._id?.toString() || '',
    });
    const resetUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(resetToken)}&role=${encodeURIComponent(role)}`;
    res.json({ ok: true, resetUrl, resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/password/reset', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });

  const payload = verifyResetToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired reset token' });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const role = payload.role || 'customer';
    const model = getRoleModel(role);
    const mongoUser = await model.findOne({ email: payload.email });
    if (mongoUser) {
      mongoUser.password = hashed;
      await mongoUser.save();
    }

    const pgUser = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
    if (pgUser.rows[0]) {
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, payload.email]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/google/start', async (req, res) => {
  const allowedRoles = new Set(['customer', 'vendor', 'admin']);
  const requestedRole = String(req.query.role || 'customer').toLowerCase();
  const role = allowedRoles.has(requestedRole) ? requestedRole : 'customer';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`;

  if (!clientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID missing' });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', Buffer.from(JSON.stringify({ role })).toString('base64url'));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  res.redirect(url.toString());
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return res.status(500).send('Google OAuth is not configured');

  const allowedRoles = new Set(['customer', 'vendor', 'admin']);
  const roleState = state ? JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8')) : { role: 'customer' };
  const role = allowedRoles.has(String(roleState.role || '').toLowerCase()) ? String(roleState.role).toLowerCase() : 'customer';

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) return res.status(400).send('Google token exchange failed');

  const tokenData = await tokenResponse.json();
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileResponse.ok) return res.status(400).send('Google profile fetch failed');

  const profile = await profileResponse.json();
  const passwordSeed = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(passwordSeed, 10);
  await upsertMongoRoleUser(role, {
    name: profile.name,
    email: profile.email,
    password: hashedPassword,
  });

  const pgExisting = await pool.query('SELECT id, email, role FROM users WHERE email = $1 LIMIT 1', [profile.email]);
  let pgUser = pgExisting.rows[0];
  if (!pgUser) {
    const inserted = await pool.query(
      'INSERT INTO users(email,password,name,role) VALUES($1,$2,$3,$4) RETURNING id,email,role',
      [profile.email, hashedPassword, profile.name || profile.email.split('@')[0], role]
    );
    pgUser = inserted.rows[0];
  }

  const tokenPayload = { id: pgUser.id, email: pgUser.email, role: pgUser.role || role };
  const accessToken = signToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  res.cookie('refresh_token', refreshToken, cookieOptions());

  const html = `<!doctype html><html><body><script>
    (function() {
      const message = ${JSON.stringify({ type: 'vendorhub-oauth', token: accessToken, user: { id: pgUser.id, email: pgUser.email, role: pgUser.role || role, name: profile.name } })};
      if (window.opener) {
        window.opener.postMessage(message, '*');
      }
      document.body.innerHTML = '<p>Login complete. You can close this window.</p>';
      setTimeout(function(){ window.close(); }, 500);
    })();
  </script></body></html>`;
  res.set('Content-Type', 'text/html').send(html);
});

router.post('/vendor/request', async (req, res) => {
  const { user_id, name, description, city, country } = req.body;
  if (!user_id || !name) return res.status(400).json({ error: 'user_id and name required' });
  try {
    const result = await pool.query(
      'INSERT INTO vendors(user_id,name,description,city,country,approved) VALUES($1,$2,$3,$4,$5,false) RETURNING id',
      [user_id, name, description, city, country]
    );
    res.json({ vendor_id: result.rows[0].id, status: 'pending' });
  } catch (err) {
    logger.error('vendor_request_error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
