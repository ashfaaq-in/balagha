/* ============================================================
   BALAGHA — Orders API Routes
   POST /api/orders        → Create a new order (COD or Online)
   GET  /api/orders        → [Admin] Get all orders
   GET  /api/orders/:id    → [Admin/Customer] Get single order
   PATCH /api/orders/:id   → [Admin] Update order status / tracking
============================================================ */

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const Order    = require('../models/Order');
const { sendAdminOrderAlert, sendCustomerConfirmation, sendTrackingUpdate } = require('../services/emailService');

// ── Helpers ───────────────────────────────────────────────────
function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `BLG-${ts}-${rd}`;
}

function calcBillingTotals(items, paymentMethod) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCharge = subtotal >= 999 ? 0 : 79; // Free shipping above ₹999
  const codFee = paymentMethod === 'cod' ? 40 : 0;
  const totalAmount = subtotal + shippingCharge + codFee;
  return { subtotal, shippingCharge, codFee, totalAmount };
}

// ── POST /api/orders ──────────────────────────────────────────
// Creates order. For COD: paymentStatus = 'pending'.
// For online: paymentStatus = 'pending' until Razorpay confirms.
router.post('/', async (req, res, next) => {
  try {
    const { customer, items, paymentMethod } = req.body;

    // Validate required fields
    if (!customer || !items?.length || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Missing required order data.' });
    }
    if (!['online', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method.' });
    }

    const { subtotal, shippingCharge, codFee, totalAmount } = calcBillingTotals(items, paymentMethod);
    const orderId = generateOrderId();

    const order = await Order.create({
      orderId,
      customer,
      items,
      subtotal,
      shippingCharge,
      codFee,
      totalAmount,
      paymentMethod,
      paymentStatus: 'pending', // Razorpay route will update to 'paid' after verification
    });

    // Fire emails asynchronously (don't block response)
    Promise.all([
      sendAdminOrderAlert(order).catch(e => console.error('[EMAIL ERROR] Admin alert:', e.message)),
      sendCustomerConfirmation(order).catch(e => console.error('[EMAIL ERROR] Customer confirm:', e.message)),
    ]);

    res.status(201).json({
      success: true,
      orderId: order.orderId,
      _id: order._id,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
    });

  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders ──────────────────────────────────────────
// Admin: list all orders, newest first. Supports filter by status.
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.paymentStatus)    filter.paymentStatus = req.query.paymentStatus;
    if (req.query.fulfillmentStatus) filter.fulfillmentStatus = req.query.fulfillmentStatus;
    if (req.query.paymentMethod)    filter.paymentMethod = req.query.paymentMethod;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    const stats = await Order.aggregate([
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        paidRevenue:  { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        codPending:   { $sum: { $cond: [{ $and: [{ $eq: ['$paymentMethod', 'cod'] }, { $eq: ['$paymentStatus', 'pending'] }] }, '$totalAmount', 0] } },
        totalOrders:  { $sum: 1 },
      }}
    ]);

    res.json({ success: true, orders, stats: stats[0] || {} });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:id ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/orders/:id ────────────────────────────────────
// Admin: update fulfillment status, add tracking ID, etc.
router.patch('/:id', adminAuth, async (req, res, next) => {
  try {
    const allowed = ['fulfillmentStatus', 'trackingId', 'trackingUrl', 'courierName', 'paymentStatus', 'adminNotes'];
    const update = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) update[field] = req.body[field]; });

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { $set: update },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    // If tracking ID was just added — notify customer
    if (req.body.trackingId && order.fulfillmentStatus === 'shipped') {
      sendTrackingUpdate(order).catch(e => console.error('[EMAIL ERROR] Tracking email:', e.message));
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── Admin Auth Middleware ────────────────────────────────────
// Simple password-based protection for admin routes.
// In production, replace with JWT tokens.
function adminAuth(req, res, next) {
  const auth = req.headers['x-admin-password'];
  if (!auth || auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  next();
}

module.exports = router;
