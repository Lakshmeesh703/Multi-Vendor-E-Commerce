const { verifyToken } = require('../utils/jwt');

function extractBearer(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

function requireRole(role) {
  return (req, res, next) => {
    const token = extractBearer(req) || req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });
    if (role && payload.role !== role) return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  };
}

const verifyAdmin = requireRole('admin');
const verifyVendor = requireRole('vendor');
const verifyCustomer = requireRole('customer');

module.exports = { verifyAdmin, verifyVendor, verifyCustomer, requireRole };
