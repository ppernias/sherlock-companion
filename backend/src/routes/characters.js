const express = require('express');
const db = require('../config/database');
const { verifyToken, requireAdmin, requireGameAccess } = require('../middleware/auth');

const router = express.Router();

// Helper to normalize casos string (remove spaces, sort)
// Accepts:
//   '*' = global character (appears in all cases)
//   '' = unassigned (not in any case yet)
//   '1,2,3' = specific cases
function normalizeCasos(casos) {
  if (casos === null || casos === undefined) return '';
  const trimmed = String(casos).trim();
  // Empty string = unassigned
  if (trimmed === '') return '';
  // Allow '*' as special value for global characters
  if (trimmed === '*') return '*';
  const normalized = trimmed
    .split(',')
    .map(c => c.trim())
    .filter(c => c && !isNaN(c))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .join(',');
  return normalized || '';
}

// Get all characters with optional filters
router.get('/', verifyToken, requireGameAccess, (req, res) => {
  const { caso, nombre, oficio, categoria, search, includeUnassigned, excludeGlobal, limit = 50, offset = 0 } = req.query;

  // Add es_global computed field (true if casos = '*')
  let query = `SELECT *, (casos = '*') as es_global FROM characters WHERE 1=1`;
  const params = [];

  // Filter by caso - search in comma-separated list
  // excludeGlobal=true: strict filter, only show characters from that specific case
  // excludeGlobal=false (default): also include global characters (for game mode)
  if (caso) {
    if (caso === '*') {
      // Filter only global characters (informantes)
      query += ` AND casos = '*'`;
    } else if (caso === '') {
      // Filter only unassigned characters
      query += ` AND casos = ''`;
    } else if (excludeGlobal === 'true') {
      // Strict filter: only characters from this specific case (no globals)
      query += ` AND (casos = ? OR casos LIKE ? OR casos LIKE ? OR casos LIKE ?)`;
      params.push(caso, `${caso},%`, `%,${caso}`, `%,${caso},%`);
    } else {
      // Include global characters along with case-specific ones
      query += ` AND (casos = ? OR casos LIKE ? OR casos LIKE ? OR casos LIKE ? OR casos = '*')`;
      params.push(caso, `${caso},%`, `%,${caso}`, `%,${caso},%`);
    }
  }

  // By default, exclude unassigned characters unless explicitly requested
  if (includeUnassigned !== 'true' && caso !== '') {
    query += ` AND casos != ''`;
  }

  if (nombre) {
    query += ' AND nombre LIKE ?';
    params.push(`%${nombre}%`);
  }

  if (oficio) {
    query += ' AND oficio LIKE ?';
    params.push(`%${oficio}%`);
  }

  if (categoria) {
    query += ' AND categoria = ?';
    params.push(categoria);
  }

  if (search) {
    query += ' AND (nombre LIKE ? OR oficio LIKE ? OR descripcion LIKE ? OR nombre_caso LIKE ? OR categoria LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Order: regular characters first (by casos), then global characters (*)
  query += ' ORDER BY es_global ASC, casos ASC, nombre ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    // Convert es_global and es_informante from 0/1 to boolean
    const result = rows.map(row => ({
      ...row,
      es_global: row.es_global === 1,
      es_informante: row.es_informante === 1
    }));
    res.json(result);
  });
});

// Get single character by ID
router.get('/:id', verifyToken, requireGameAccess, (req, res) => {
  const { id } = req.params;

  db.get(`SELECT *, (casos = '*') as es_global FROM characters WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Convert es_global and es_informante from 0/1 to boolean
    res.json({
      ...row,
      es_global: row.es_global === 1,
      es_informante: row.es_informante === 1
    });
  });
});

// Create new character (admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, categoria, es_informante } = req.body;

  const normalizedCasos = normalizeCasos(casos);

  // nombre is the only required field
  if (!nombre) {
    return res.status(400).json({ error: 'nombre is required' });
  }

  const query = `
    INSERT INTO characters (casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, categoria, es_informante)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const finalCategoria = categoria || 'Sin categoría';
  const finalEsInformante = es_informante ? 1 : 0;

  db.run(query, [normalizedCasos, nombre_caso || '', nombre, oficio || null, descripcion || null, prompt || null, image_file || null, finalCategoria, finalEsInformante], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.status(201).json({
      id: this.lastID,
      casos: normalizedCasos,
      nombre_caso: nombre_caso || '',
      nombre,
      oficio,
      descripcion,
      prompt,
      image_file,
      categoria: finalCategoria,
      es_informante: finalEsInformante === 1,
      message: 'Character created successfully'
    });
  });
});

// Update character (admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, categoria, es_informante } = req.body;

  const normalizedCasos = normalizeCasos(casos);

  // nombre is the only required field
  if (!nombre) {
    return res.status(400).json({ error: 'nombre is required' });
  }

  const finalCategoria = categoria || 'Sin categoría';
  const finalEsInformante = es_informante ? 1 : 0;

  const query = `
    UPDATE characters
    SET casos = ?, nombre_caso = ?, nombre = ?, oficio = ?, descripcion = ?, prompt = ?, image_file = ?, categoria = ?, es_informante = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [normalizedCasos, nombre_caso || '', nombre, oficio || null, descripcion || null, prompt || null, image_file || null, finalCategoria, finalEsInformante, id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ message: 'Character updated successfully' });
  });
});

// Delete character (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM characters WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ message: 'Character deleted successfully' });
  });
});

module.exports = router;
