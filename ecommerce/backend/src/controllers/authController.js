const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const { signToken } = require('../utils/jwt');

const DEMO_LOGIN_ACCOUNTS = {
  'customer@vendorhub.local': { role: 'customer', name: 'Customer', password: 'customer123' },
  'vendor@vendorhub.local': { role: 'vendor', name: 'Vendor', password: 'vendor123' },
  'admin@vendorhub.local': { role: 'admin', name: 'Admin', password: 'admin123' },
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveExpectedRole(user, expectedRole) {
  if (!expectedRole) return true;
  return user.role === expectedRole;
}

// Generic register helper (role-aware)
async function registerRole(req, res, Model, extra = {}) {
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'name,email,password required' });
  const existing = await Model.findOne({ email: normalizeEmail(email) });
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const doc = new Model({ name, email: normalizeEmail(email), password: hash, ...extra });
  await doc.save();
  const token = signToken({ id: doc._id, email: doc.email, role: doc.role });
  // Return 201 Created for registrations
  res.status(201).json({ user: { id: doc._id, email: doc.email, name: doc.name, role: doc.role }, token });
}

// Generic login helper
async function loginRole(req, res, Model, expectedRole) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  const normalizedEmail = normalizeEmail(email);

  const demo = DEMO_LOGIN_ACCOUNTS[normalizedEmail];
  if (demo && resolveExpectedRole(demo, expectedRole) && demo.password === password) {
    const token = signToken({ id: `demo-${demo.role}`, email: normalizedEmail, role: demo.role });
    return res.json({ user: { id: `demo-${demo.role}`, email: normalizedEmail, name: demo.name, role: demo.role }, token });
  }

  let user = null;
  try {
    user = await Model.findOne({ $or: [{ email: normalizedEmail }, { name: email }] });
  } catch {
    user = null;
  }

  if (user) {
    if (!resolveExpectedRole(user, expectedRole)) return res.status(403).json({ error: 'Use the correct role login page' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user._id, email: user.email, role: user.role });
    return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role }, token });
  }

  return res.status(400).json({ error: 'Invalid credentials' });
}

module.exports = { registerRole, loginRole };
