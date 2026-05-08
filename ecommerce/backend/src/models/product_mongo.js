const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema({
  user_id: { type: String },
  rating: { type: Number, min: 0, max: 5 },
  comment: { type: String },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const ProductSchema = new Schema({
  vendor_id: { type: Number, index: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, index: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0, index: true },
  currency: { type: String, default: 'INR' },
  attributes: { type: Schema.Types.Mixed, default: {} }, // flexible per-vendor attributes
  inventory: {
    sku: String,
    quantity: { type: Number, default: 0 }
  },
  images: [String],
  reviews: [ReviewSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
