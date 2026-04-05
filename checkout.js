/* ============================================================
   BALAGHA — Checkout Logic (With Real Backend + Razorpay)
   Replaces the old simulated setTimeout flow.
============================================================ */

'use strict';

const API_BASE = 'http://localhost:5000/api'; // Change to your deployed URL in production

document.addEventListener('DOMContentLoaded', () => {
  const items = window.Cart?.getItems() || [];

  if (items.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  /* ── Render Order Summary ── */
  const container = document.getElementById('chk-items');
  container.innerHTML = items.map(p => `
    <div class="chk-item">
      <div class="chk-item-img">
        <img src="${p.image}" alt="${p.name}">
        <div class="chk-item-qty">${p.qty}</div>
      </div>
      <div>
        <div class="chk-item-name">${p.name}</div>
        <div class="chk-item-size">Size: ${p.size}</div>
      </div>
      <div class="chk-item-price">₹${(p.price * p.qty).toLocaleString('en-IN')}</div>
    </div>
  `).join('');

  /* ── Billing Totals (mirrors backend logic) ── */
  const subtotal      = window.Cart.subtotal();
  const shippingFee   = subtotal >= 999 ? 0 : 79;
  let   codFee        = 0;

  function updateTotals() {
    const method = document.querySelector('input[name="payment"]:checked')?.value || 'online';
    codFee = method === 'cod' ? 40 : 0;
    const total = subtotal + shippingFee + codFee;

    document.getElementById('chk-sub').textContent    = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('chk-ship').textContent   = shippingFee === 0 ? 'FREE' : `₹${shippingFee}`;
    document.getElementById('chk-cod').textContent    = codFee ? `₹${codFee}` : '—';
    document.getElementById('chk-total').textContent  = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('btn-total').textContent  = total.toLocaleString('en-IN');
  }

  /* ── Payment Toggle ── */
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.pm-opt').forEach(opt => opt.classList.remove('active'));
      if (radio.checked) radio.closest('.pm-opt').classList.add('active');
      updateTotals();
    });
  });

  updateTotals();

  /* ── Form Submission ── */
  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* Validate */
    let valid = true;
    form.querySelectorAll('[required]').forEach(f => {
      if (!f.value.trim()) { valid = false; f.classList.add('is-invalid'); }
      else f.classList.remove('is-invalid');
    });

    if (!valid) { window.Toast.show('Please fill in all required fields.', 'info'); return; }

    const pin = document.getElementById('chk-pin').value;
    if (!/^\d{6}$/.test(pin)) {
      document.getElementById('chk-pin').classList.add('is-invalid');
      window.Toast.show('Please enter a valid 6-digit PIN code.', 'info');
      return;
    }

    /* Show loading */
    const btn    = document.getElementById('place-order-btn');
    const ogHTML = btn.innerHTML;
    btn.innerHTML = `<svg style="animation:spin 1s linear infinite;width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Processing...`;
    btn.disabled = true;

    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'online';

    /* Build order payload */
    const orderPayload = {
      paymentMethod,
      customer: {
        firstName: document.getElementById('chk-fname').value.trim(),
        lastName:  document.getElementById('chk-lname').value.trim(),
        email:     document.getElementById('chk-email').value.trim(),
        phone:     document.getElementById('chk-phone').value.trim(),
        address:   document.getElementById('chk-address').value.trim(),
        city:      document.getElementById('chk-city').value.trim(),
        state:     document.getElementById('chk-state').value.trim(),
        pincode:   pin,
      },
      items: items.map(i => ({
        productId: i.id,
        name:      i.name,
        price:     i.price,
        qty:       i.qty,
        size:      i.size,
        image:     i.image || '',
      })),
    };

    try {
      /* Step 1: Create order on backend */
      const res = await fetch(`${API_BASE}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(orderPayload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Order creation failed.');

      const { orderId, totalAmount } = data;

      /* Step 2a: COD — done, redirect */
      if (paymentMethod === 'cod') {
        window.Cart.clear();
        sessionStorage.setItem('balagha_last_order', orderId);
        window.location.href = `order-success.html?orderId=${orderId}&method=cod`;
        return;
      }

      /* Step 2b: Online — create Razorpay order */
      const rzpRes = await fetch(`${API_BASE}/payment/create-order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId }),
      });
      const rzpData = await rzpRes.json();
      if (!rzpData.success) throw new Error(rzpData.error || 'Payment initiation failed.');

      /* Step 3: Open Razorpay Checkout popup */
      const rzpOptions = {
        key:         rzpData.keyId,
        amount:      rzpData.amount,
        currency:    rzpData.currency,
        name:        'Balagha',
        description: `Order ${orderId}`,
        order_id:    rzpData.razorpayOrderId,
        prefill: {
          name:    rzpData.customer.name,
          email:   rzpData.customer.email,
          contact: rzpData.customer.phone,
        },
        theme: { color: '#c9a96e' },
        modal: {
          ondismiss: () => {
            btn.innerHTML = ogHTML;
            btn.disabled  = false;
            window.Toast.show('Payment was cancelled. Your order is saved — you can retry.', 'info');
          },
        },
        handler: async (rzpResponse) => {
          /* Step 4: Verify payment on backend */
          const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature:  rzpResponse.razorpay_signature,
              orderId,
            }),
          });
          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            window.Toast.show('Payment verification failed. Please contact support.', 'info');
            btn.innerHTML = ogHTML;
            btn.disabled  = false;
            return;
          }

          /* ✅ Payment confirmed */
          window.Cart.clear();
          sessionStorage.setItem('balagha_last_order', orderId);
          window.location.href = `order-success.html?orderId=${orderId}&method=online`;
        },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();

    } catch (err) {
      console.error('[CHECKOUT ERROR]', err);
      window.Toast.show(err.message || 'Something went wrong. Please try again.', 'info');
      btn.innerHTML = ogHTML;
      btn.disabled  = false;
    }
  });

  /* ── Clear validation styling on input ── */
  form.querySelectorAll('.chk-input, .chk-select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('is-invalid'));
  });
});

/* ── Spin animation ── */
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
