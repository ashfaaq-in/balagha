/* ============================================================
   BALAGHA — Razorpay Payment Routes
   POST /api/payment/create-order  → Create Razorpay order
   POST /api/payment/verify        → Verify payment signature
   POST /api/payment/webhook       → Razorpay webhook (auto-verify)
============================================================ */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const Order    = require('../models/Order');

// Razorpay instance — initialized with API keys from .env
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/payment/create-order ───────────────────────────
// Called by frontend just before opening the Razorpay popup.
// Requires the internal order _id to link the payment to the order.
router.post('/create-order', async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required.' });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (order.paymentMethod !== 'online') {
      return res.status(400).json({ success: false, error: 'This order uses COD, not online payment.' });
    }

    // Create Razorpay order (amount in paise — multiply by 100)
    const rzpOrder = await razorpay.orders.create({
      amount:   Math.round(order.totalAmount * 100),
      currency: 'INR',
      receipt:  order.orderId,
      notes:    {
        balagha_order_id: order.orderId,
        customer_email:   order.customer.email,
        customer_phone:   order.customer.phone,
      },
    });

    // Save razorpayOrderId on the order record
    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount:          rzpOrder.amount,    // in paise
      currency:        rzpOrder.currency,
      keyId:           process.env.RAZORPAY_KEY_ID,
      customer: {
        name:  `${order.customer.firstName} ${order.customer.lastName}`,
        email: order.customer.email,
        phone: order.customer.phone,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payment/verify ──────────────────────────────────
// Frontend calls this after successful Razorpay payment.
// Verifies the HMAC signature to ensure payment is genuine.
router.post('/verify', async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields.' });
    }

    // HMAC-SHA256 verification
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      // Log the failed attempt
      console.warn(`[PAYMENT] Signature mismatch for order ${orderId}. Possible tampering.`);
      return res.status(400).json({ success: false, error: 'Payment verification failed. Please contact support.' });
    }

    // Signature valid — mark order as paid
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          paymentStatus:     'paid',
          razorpayOrderId:   razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, error: 'Order not found after verification.' });

    console.log(`[PAYMENT] ✅ Payment verified for order ${orderId} | Razorpay ID: ${razorpay_payment_id}`);
    res.json({ success: true, orderId: order.orderId, paymentStatus: order.paymentStatus });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/payment/webhook ─────────────────────────────────
// Razorpay sends events here automatically.
// This is a safety net in case the browser closed before /verify was called.
// Configure this URL in Razorpay Dashboard → Settings → Webhooks.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_KEY_SECRET; // Use a dedicated webhook secret in production
  const signature     = req.headers['x-razorpay-signature'];

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('hex');

  if (expectedSig !== signature) {
    console.warn('[WEBHOOK] Invalid Razorpay webhook signature.');
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  console.log(`[WEBHOOK] Received event: ${event.event}`);

  if (event.event === 'payment.captured') {
    const payment  = event.payload.payment.entity;
    const receipt  = payment.order_id; // This is the Razorpay order ID
    const paymentId = payment.id;

    // Find the order by razorpayOrderId and mark it paid if not already
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: receipt, paymentStatus: { $ne: 'paid' } },
      { $set: { paymentStatus: 'paid', razorpayPaymentId: paymentId } },
      { new: true }
    );

    if (order) {
      console.log(`[WEBHOOK] ✅ Order ${order.orderId} marked as PAID via webhook.`);
    }
  }

  res.json({ received: true });
});

module.exports = router;
