const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    
    const payload = {
      id: result.lastInsertRowid,
      name,
      email,
      role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretjwtkeyforfarmersforus2026', { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: payload
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

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretjwtkeyforfarmersforus2026', { expiresIn: '1d' });

    res.json({
      success: true,
      token,
      user: payload,
      data: { token, user: payload }
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

const getUserStats = async (req, res) => {
  try {
    const stats = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, getUserStats, sendOtp, verifyOtp };
