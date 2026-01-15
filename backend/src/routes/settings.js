const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current PIN (admin only)
router.get('/pin', verifyToken, requireAdmin, (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['game_pin'], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ pin: row ? row.value : '1895' });
  });
});

// Update PIN (admin only)
router.put('/pin', verifyToken, requireAdmin, (req, res) => {
  const { pin } = req.body;

  if (!pin || pin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }

  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['game_pin', pin], (err) => {
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
