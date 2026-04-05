/* ============================================================
   BALAGHA — Email Service (Nodemailer)
   Sends order notifications to admin & customer.
============================================================ */

const nodemailer = require('nodemailer');

// Build transporter once — reused for all emails
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Helpers ──────────────────────────────────────────
function itemsHtml(items) {
  return items.map(i => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #2e6b4f;">${i.name} (${i.size})</td>
      <td style="padding:8px; border-bottom:1px solid #2e6b4f; text-align:center;">${i.qty}</td>
      <td style="padding:8px; border-bottom:1px solid #2e6b4f; text-align:right;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
}

function emailWrapper(title, body) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>${title}</title></head>
  <body style="margin:0; padding:0; background:#0d1f15; font-family:'Jost',Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:#254d3a; border-radius:12px; overflow:hidden;">
      <!-- Header -->
      <div style="background:#0d1f15; padding:28px 40px; text-align:center; border-bottom:2px solid #c9a96e;">
        <span style="font-family:Georgia,serif; font-size:2rem; color:#c9a96e; font-weight:700;">Balagha</span>
      </div>
      <!-- Body -->
      <div style="padding:32px 40px; color:#f2ede4;">
        ${body}
      </div>
      <!-- Footer -->
      <div style="background:#0d1f15; padding:20px 40px; text-align:center;">
        <p style="color:rgba(242,237,228,0.4); font-size:0.8rem; margin:0;">
          © 2026 Balagha. Modest, Feminine, Timeless. | <a href="mailto:hello@balagha.in" style="color:#c9a96e;">hello@balagha.in</a>
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

// ── Admin: New Order Alert ────────────────────────────
async function sendAdminOrderAlert(order) {
  const transporter = createTransporter();
  const paymentBadge = order.paymentStatus === 'paid'
    ? `<span style="background:#c9a96e; color:#0d1f15; padding:2px 10px; border-radius:20px; font-weight:700;">PAID</span>`
    : `<span style="background:#e0c08a; color:#0d1f15; padding:2px 10px; border-radius:20px; font-weight:700;">COD – PENDING</span>`;

  const body = `
    <h2 style="color:#c9a96e; margin-top:0;">🛍️ New Order Received!</h2>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()} — ${paymentBadge}</p>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <h3 style="color:#e0c08a;">Customer Details</h3>
    <p>${order.customer.firstName} ${order.customer.lastName}<br>
       📞 ${order.customer.phone}<br>
       ✉️ ${order.customer.email}</p>
    <p>📍 ${order.customer.address}, ${order.customer.city}, ${order.customer.state} — ${order.customer.pincode}</p>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <h3 style="color:#e0c08a;">Items Ordered</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#0d1f15;">
          <th style="padding:10px 8px; text-align:left; color:#c9a96e;">Product</th>
          <th style="padding:10px 8px; text-align:center; color:#c9a96e;">Qty</th>
          <th style="padding:10px 8px; text-align:right; color:#c9a96e;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml(order.items)}</tbody>
    </table>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <p>Subtotal: ₹${order.subtotal.toLocaleString('en-IN')}</p>
    ${order.codFee ? `<p>COD Fee: ₹${order.codFee}</p>` : ''}
    <p style="font-size:1.2rem;"><strong style="color:#c9a96e;">Total: ₹${order.totalAmount.toLocaleString('en-IN')}</strong></p>
    <a href="${process.env.FRONTEND_URL}/admin/index.html" style="display:inline-block; margin-top:16px; background:#c9a96e; color:#0d1f15; padding:12px 28px; border-radius:50px; font-weight:700; text-decoration:none;">View in Admin Panel →</a>
  `;

  await transporter.sendMail({
    from: `"Balagha Orders" <${process.env.EMAIL_USER}>`,
    to:   process.env.ADMIN_EMAIL,
    subject: `🛍️ New Order #${order.orderId} — ₹${order.totalAmount.toLocaleString('en-IN')}`,
    html: emailWrapper('New Order', body),
  });
  console.log(`[EMAIL] Admin alert sent for order ${order.orderId}`);
}

// ── Customer: Order Confirmation ──────────────────────
async function sendCustomerConfirmation(order) {
  const transporter = createTransporter();
  const body = `
    <h2 style="color:#c9a96e; margin-top:0;">Thank you, ${order.customer.firstName}! ✨</h2>
    <p>Your order has been placed successfully. We will pack and ship it as soon as possible, in shaa Allah.</p>
    <p><strong>Order ID:</strong> <span style="color:#c9a96e;">${order.orderId}</span></p>
    <p><strong>Payment:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery (pay when you receive)' : 'Online — Paid ✅'}</p>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <h3 style="color:#e0c08a;">Your Items</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#0d1f15;">
          <th style="padding:10px 8px; text-align:left; color:#c9a96e;">Product</th>
          <th style="padding:10px 8px; text-align:center; color:#c9a96e;">Qty</th>
          <th style="padding:10px 8px; text-align:right; color:#c9a96e;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml(order.items)}</tbody>
    </table>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <p style="font-size:1.2rem;"><strong style="color:#c9a96e;">Total: ₹${order.totalAmount.toLocaleString('en-IN')}</strong></p>
    <hr style="border-color:#2e6b4f; margin:20px 0;">
    <h3 style="color:#e0c08a;">Shipping To</h3>
    <p>${order.customer.address}, ${order.customer.city}, ${order.customer.state} — ${order.customer.pincode}</p>
    <p style="color:rgba(242,237,228,0.6); font-size:0.9rem;">You will receive another email with your tracking number once the order is shipped.</p>
  `;

  await transporter.sendMail({
    from: `"Balagha" <${process.env.EMAIL_USER}>`,
    to:   order.customer.email,
    subject: `Your Balagha Order #${order.orderId} is confirmed! 🌙`,
    html: emailWrapper('Order Confirmed', body),
  });
  console.log(`[EMAIL] Customer confirmation sent to ${order.customer.email}`);
}

// ── Customer: Tracking Update ─────────────────────────
async function sendTrackingUpdate(order) {
  const transporter = createTransporter();
  const body = `
    <h2 style="color:#c9a96e; margin-top:0;">Your order is on its way! 🚚</h2>
    <p>Great news, ${order.customer.firstName}! Your Balagha order has been shipped.</p>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Courier:</strong> ${order.courierName || 'Standard Courier'}</p>
    <p><strong>Tracking ID:</strong> <span style="color:#c9a96e; font-size:1.1rem;">${order.trackingId}</span></p>
    ${order.trackingUrl ? `<a href="${order.trackingUrl}" style="display:inline-block; margin-top:16px; background:#c9a96e; color:#0d1f15; padding:12px 28px; border-radius:50px; font-weight:700; text-decoration:none;">Track Your Order →</a>` : ''}
    <p style="margin-top:24px; color:rgba(242,237,228,0.6); font-size:0.9rem;">If you have any questions, reply to this email or contact us at hello@balagha.in.</p>
  `;

  await transporter.sendMail({
    from: `"Balagha" <${process.env.EMAIL_USER}>`,
    to:   order.customer.email,
    subject: `Your Balagha order #${order.orderId} has shipped! 🚚`,
    html: emailWrapper('Order Shipped', body),
  });
  console.log(`[EMAIL] Tracking update sent to ${order.customer.email}`);
}

module.exports = { sendAdminOrderAlert, sendCustomerConfirmation, sendTrackingUpdate };
