const express = require('express');
const db = require('../config/database');
const { verifyToken, requireGameAccess } = require('../middleware/auth');

const router = express.Router();

// Get all unique cases
router.get('/', verifyToken, requireGameAccess, (req, res) => {
  // Get all casos values and extract unique case numbers (excluding informants with casos = '*')
  db.all(`SELECT casos, nombre_caso FROM characters WHERE casos != '*'`, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Extract unique case numbers and their names
    const casesMap = new Map();

    rows.forEach(row => {
      if (row.casos) {
        const caseNumbers = row.casos.split(',').map(c => c.trim());
        caseNumbers.forEach(caseNum => {
          if (caseNum && !casesMap.has(caseNum)) {
            casesMap.set(caseNum, row.nombre_caso);
          }
        });
      }
    });

    // Convert to array and sort
    const cases = Array.from(casesMap.entries())
      .map(([caso, nombre_caso]) => ({ caso: parseInt(caso), nombre_caso }))
      .sort((a, b) => a.caso - b.caso);

    // Count characters per case
    const result = cases.map(c => {
      const count = rows.filter(row => {
        if (!row.casos) return false;
        const nums = row.casos.split(',').map(n => n.trim());
        return nums.includes(String(c.caso));
      }).length;
      return { ...c, character_count: count };
    });

    res.json(result);
  });
});

// Get characters for a specific case
router.get('/:caso/characters', verifyToken, requireGameAccess, (req, res) => {
  const { caso } = req.params;

  // Search for caso in comma-separated list
  const query = `
    SELECT * FROM characters
    WHERE casos = ? OR casos LIKE ? OR casos LIKE ? OR casos LIKE ?
    ORDER BY nombre ASC
  `;

  db.all(query, [caso, `${caso},%`, `%,${caso}`, `%,${caso},%`], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(rows);
  });
});

module.exports = router;
