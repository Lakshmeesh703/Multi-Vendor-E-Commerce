const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const { signToken } = require('../utils/jwt');

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
  const user = await Model.findOne({ $or: [{ email: normalizedEmail }, { name: email }] });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  if (!resolveExpectedRole(user, expectedRole)) return res.status(403).json({ error: 'Use the correct role login page' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = signToken({ id: user._id, email: user.email, role: user.role });
  res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role }, token });
}

module.exports = { registerRole, loginRole };
