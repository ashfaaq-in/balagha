/* ============================================================
   BALAGHA — Express Server Entry Point
============================================================ */

'use strict';
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── CORS ── */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

/* ── Body Parsers ── */
// Note: /api/payment/webhook uses raw body — must be registered BEFORE json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Routes ── */
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));

/* ── Health Check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Balagha Backend', timestamp: new Date().toISOString() });
});

/* ── 404 ── */
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

/* ── Global Error Handler ── */
app.use(errorHandler);

/* ── MongoDB Connection + Start Server ── */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Balagha backend running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
