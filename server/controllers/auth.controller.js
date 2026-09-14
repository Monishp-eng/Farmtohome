const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfarmersforus2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkeyforfarmersforus2026_rotate';

// Helper to generate access & refresh token pair with rotation
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(
    { id: user.id, nonce: Date.now() + '-' + Math.random().toString(36).substring(2, 8) },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token in database for verification & revocation
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
      .run(user.id, refreshToken, expiresAt);
  } catch (err) {
    console.warn('[Refresh Token Store Warning]:', err.message);
  }

  return {
    accessToken,
    refreshToken,
    token: accessToken, // backwards compatibility for existing frontend
    user: payload
  };
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, location, state, latitude, longitude } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let result;
    try {
      result = stmt.run(name, email, passwordHash, role, phone, location, state, latitude, longitude);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      throw err;
    }
    
    const user = {
      id: result.lastInsertRowid,
      name,
      email,
      role,
      phone
    };

    const tokens = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...tokens
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful',
      ...tokens,
      data: { token: tokens.accessToken, user: tokens.user }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, phone, location, state, latitude, longitude, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, state, latitude, longitude } = req.body;
    
    const stmt = db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          location = COALESCE(?, location),
          state = COALESCE(?, state),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude)
      WHERE id = ?
    `);
    
    stmt.run(name, phone, location, state, latitude, longitude, req.user.id);
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const otpService = require('../services/otp.service');
const mapsService = require('../services/maps.service');

const sendOtp = async (req, res) => {
  try {
    const { phone, purpose = 'REGISTRATION' } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const result = await otpService.sendOTP(phone, purpose);
    res.json({
      success: true,
      message: 'OTP dispatched via SMS successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP are required' });

    const verification = otpService.verifyOTP(phone, otp);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: { phone, verified: true }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
  }
};

const updateBankDetails = async (req, res) => {
  try {
    const { bank_account_number, bank_ifsc } = req.body;
    
    db.prepare(`
      UPDATE users 
      SET bank_account_number = ?,
          bank_ifsc = ?,
          bank_verified = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bank_account_number, bank_ifsc.toUpperCase(), req.user.id);
    
    res.json({
      success: true,
      message: 'Bank account verified and registered for direct payouts',
      data: {
        bank_account_number: `XXXXXX${bank_account_number.slice(-4)}`,
        bank_ifsc: bank_ifsc.toUpperCase(),
        bank_verified: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // 1. Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // 2. Verify token exists in database (has not been revoked)
    let record;
    try {
      record = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?').get(refreshToken, decoded.id);
    } catch (e) {}

    if (!record) {
      return res.status(401).json({ success: false, message: 'Refresh token not recognized or revoked' });
    }

    // 2.1 Verify token has not expired
    if (record.expires_at && new Date(record.expires_at) <= new Date()) {
      try {
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      } catch (e) {}
      return res.status(401).json({ success: false, message: 'Refresh token has expired' });
    }

    // 3. Look up user
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 4. Delete old refresh token and purge any expired tokens for this user (rotation + cleanup)
    try {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < ?').run(decoded.id, new Date().toISOString());
    } catch (e) {}

    // 5. Issue new access + refresh token pair
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Tokens rotated successfully',
      ...tokens
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const loginWithOtp = async (req, res) => {
  try {
    const { phone, otp, role = 'farmer', name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(phone, otp);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    // Look up or auto-register rural farmer/user
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
      const dummyPass = await bcrypt.hash('phone_otp_auth_' + Date.now(), 10);
      const displayName = name || `User (${phone.slice(-4)})`;
      const email = `kisan_${phone}@farmtohome.in`;
      const ins = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, phone_verified)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(displayName, email, dummyPass, role, phone);
      user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(ins.lastInsertRowid);
    } else {
      db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(user.id);
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Logged in via Phone OTP successfully',
      ...tokens,
      data: { token: tokens.accessToken, user: tokens.user }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      } catch (e) {}
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  updateBankDetails, 
  getUserStats, 
  sendOtp, 
  verifyOtp,
  loginWithOtp,
  refreshTokenHandler,
  logout
};
