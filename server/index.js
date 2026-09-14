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
// CORS Configuration (supports local dev, Vercel frontend, and Render)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback to allow for demo convenience while preserving headers
  },
  credentials: true
}));
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

const { apiLimiter } = require('./middleware/rateLimiter');
const postgres = require('./config/postgres');

// Apply general rate limiting across all api endpoints
app.use('/api/', apiLimiter);

// ─── SYSTEM HEALTH CHECK ───
app.get('/api/health', async (req, res) => {
  const mem = process.memoryUsage();
  let dbStatus = { engine: 'sqlite', status: 'connected' };
  let isHealthy = true;

  if (process.env.DATABASE_URL) {
    const pgCheck = await postgres.testConnection();
    dbStatus = {
      engine: 'postgresql',
      connected: pgCheck.connected,
      version: pgCheck.version ? pgCheck.version.split(' ')[0] : undefined,
      error: pgCheck.error
    };
    if (!pgCheck.connected) {
      isHealthy = false;
    }
  }

  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: dbStatus,
    memory_mb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
    },
    version: '1.0.0-production'
  });
});

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
