/* ============================================================
   BALAGHA — Order Model (Mongoose Schema)
============================================================ */

const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId:  { type: String, required: true },
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  qty:        { type: Number, required: true, min: 1 },
  size:       { type: String, default: 'Default' },
  image:      { type: String, default: '' },
});

const OrderSchema = new mongoose.Schema({
  // ── Order Identity ──
  orderId: {
    type: String,
    required: true,
    unique: true,
  },

  // ── Customer Info ──
  customer: {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true },
    phone:     { type: String, required: true },
    address:   { type: String, required: true },
    city:      { type: String, required: true },
    state:     { type: String, required: true },
    pincode:   { type: String, required: true },
  },

  // ── Items ──
  items: [OrderItemSchema],

  // ── Billing ──
  subtotal:       { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  codFee:         { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },

  // ── Payment ──
  paymentMethod: {
    type: String,
    enum: ['online', 'cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },

  // ── Razorpay ──
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },

  // ── Fulfillment ──
  fulfillmentStatus: {
    type: String,
    enum: ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'processing',
  },

  // ── Shipping / Tracking ──
  courierName:  { type: String, default: null },
  trackingId:   { type: String, default: null },
  trackingUrl:  { type: String, default: null },

  // ── Notes ──
  adminNotes: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
