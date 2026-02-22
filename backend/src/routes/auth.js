const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const router = express.Router();

// Verify game PIN - Progressive access system
// PIN for case N grants access to cases 1 through N
router.post('/pin', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  // Get all 10 PINs from database
  db.all("SELECT key, value FROM settings WHERE key LIKE 'pin_caso_%'", [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Build a map of PIN -> case number
    const pinMap = {};
    rows.forEach(row => {
      const caseNum = parseInt(row.key.replace('pin_caso_', ''));
      pinMap[row.value] = caseNum;
    });

    // Check if the provided PIN matches any case PIN
    const matchedCase = pinMap[pin];

    if (!matchedCase) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Generate JWT token with maxCase (access to cases 1 through maxCase)
    const token = jwt.sign(
      { role: 'game', maxCase: matchedCase },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      maxCase: matchedCase,
      message: `PIN verified - Access to cases 1-${matchedCase}`
    });
  });
});

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, admin) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token for admin
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: admin.id, email: admin.email, role: 'admin' }
    });
  });
});

// Verify token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    res.json({ user: decoded });
  });
});

module.exports = router;
