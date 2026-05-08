const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  address: { type: String },
  cart: [{ productId: String, quantity: Number }],
  orders: [{ type: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
