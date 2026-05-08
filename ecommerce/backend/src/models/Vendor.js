const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendor' },
  shopName: { type: String },
  gstNumber: { type: String },
  phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
