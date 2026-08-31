require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // Twilio sends form-encoded POST data
app.use(morgan('dev'));

// Bypass localtunnel interstitial — Twilio webhooks need this
app.use((req, res, next) => {
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  next();
});

// Serve Sarvam AI generated audio files for Twilio <Play>
const path = require('path');
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/logistics', require('./routes/logistics.routes'));
app.use('/api/market', require('./routes/market.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/ivr', require('./routes/ivr.routes'));
app.use('/api/copilot', require('./routes/copilot.routes'));
app.use('/api/csc', require('./routes/csc.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Initialize database then start server
async function start() {
  try {
    await initializeDatabase();
    console.log('Database ready.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

start();
