const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all 10 PINs (admin only)
router.get('/pins', verifyToken, requireAdmin, (req, res) => {
  db.all("SELECT key, value FROM settings WHERE key LIKE 'pin_caso_%' ORDER BY key", [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Build pins object { 1: 'PIN1', 2: 'PIN2', ... }
    const pins = {};
    rows.forEach(row => {
      const caseNum = parseInt(row.key.replace('pin_caso_', ''));
      pins[caseNum] = row.value;
    });

    // Ensure all 10 PINs exist with defaults
    const DEFAULT_PINS = {
      1: '1895', 2: '221B', 3: '1887', 4: '1891', 5: '1894',
      6: '1902', 7: '1903', 8: '1904', 9: '1905', 10: '1927'
    };

    for (let i = 1; i <= 10; i++) {
      if (!pins[i]) {
        pins[i] = DEFAULT_PINS[i];
      }
    }

    res.json({ pins });
  });
});

// Update one or more PINs (admin only)
router.put('/pins', verifyToken, requireAdmin, (req, res) => {
  const { pins } = req.body;

  if (!pins || typeof pins !== 'object') {
    return res.status(400).json({ error: 'PINs object is required' });
  }

  // Validate all PINs
  for (const [caseNum, pin] of Object.entries(pins)) {
    const num = parseInt(caseNum);
    if (num < 1 || num > 10) {
      return res.status(400).json({ error: `Invalid case number: ${caseNum}` });
    }
    if (!pin || pin.length < 3) {
      return res.status(400).json({ error: `PIN for case ${caseNum} must be at least 3 characters` });
    }
  }

  // Update PINs in database
  const updates = Object.entries(pins).map(([caseNum, pin]) => {
    return new Promise((resolve, reject) => {
      const key = `pin_caso_${caseNum}`;
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, pin], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(updates)
    .then(() => {
      res.json({ message: 'PINs updated successfully' });
    })
    .catch(err => {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Legacy: Get current PIN for case 1 (admin only) - backwards compatibility
router.get('/pin', verifyToken, requireAdmin, (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['pin_caso_1'], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ pin: row ? row.value : '1895' });
  });
});

// Legacy: Update PIN for case 1 (admin only) - backwards compatibility
router.put('/pin', verifyToken, requireAdmin, (req, res) => {
  const { pin } = req.body;

  if (!pin || pin.length < 3) {
    return res.status(400).json({ error: 'PIN must be at least 3 characters' });
  }

  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['pin_caso_1', pin], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ message: 'PIN updated successfully' });
  });
});

// Change admin password (admin only)
router.put('/password', verifyToken, requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  db.get('SELECT * FROM admins WHERE id = ?', [req.user.id], async (err, admin) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, req.user.id], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// Get statistics (admin only)
router.get('/stats', verifyToken, requireAdmin, (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as total FROM characters', [], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    stats.totalCharacters = row.total;

    // Count unique cases from comma-separated casos field
    db.all('SELECT casos FROM characters', [], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const uniqueCases = new Set();
      rows.forEach(row => {
        if (row.casos) {
          row.casos.split(',').forEach(c => {
            const num = c.trim();
            if (num) uniqueCases.add(num);
          });
        }
      });
      stats.totalCases = uniqueCases.size;

      db.get('SELECT COUNT(*) as total FROM characters WHERE image_file IS NOT NULL AND image_file != ""', [], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        stats.charactersWithImages = row.total;

        res.json(stats);
      });
    });
  });
});

// List all admins (admin only)
router.get('/admins', verifyToken, requireAdmin, (req, res) => {
  db.all('SELECT id, email, created_at FROM admins ORDER BY created_at ASC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    // Mark current user
    const admins = rows.map(admin => ({
      ...admin,
      isCurrentUser: admin.id === req.user.id
    }));
    res.json(admins);
  });
});

// Create new admin (admin only)
router.post('/admins', verifyToken, requireAdmin, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  // Check if email already exists
  db.get('SELECT id FROM admins WHERE email = ?', [email], async (err, existing) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un administrador con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [email, passwordHash], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(201).json({
        id: this.lastID,
        email,
        message: 'Administrador creado correctamente'
      });
    });
  });
});

// Delete admin (admin only)
router.delete('/admins/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Cannot delete yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }

  // Check how many admins exist
  db.get('SELECT COUNT(*) as count FROM admins', [], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (row.count <= 1) {
      return res.status(400).json({ error: 'Debe haber al menos un administrador' });
    }

    db.run('DELETE FROM admins WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Administrador no encontrado' });
      }

      res.json({ message: 'Administrador eliminado correctamente' });
    });
  });
});

module.exports = router;
