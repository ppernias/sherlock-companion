const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { verifyToken, requireAdmin, requireGameAccess } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV uploads
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'csv');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `import-${Date.now()}.csv`);
  }
});

const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Helper to extract/normalize casos from various formats:
// "Caso 1" -> "1"
// "1" -> "1"
// "1,2,3" -> "1,2,3"
// "Caso 1, Caso 2" -> "1,2"
function normalizeCasos(value) {
  if (!value) return null;
  const str = String(value).trim();

  // Check if it contains commas (multiple cases)
  if (str.includes(',')) {
    const parts = str.split(',').map(p => {
      const trimmed = p.trim();
      // Try "Caso X" format
      const match = trimmed.match(/^Caso\s+(\d+)/i);
      if (match) return match[1];
      // Try direct number
      const num = parseInt(trimmed);
      return isNaN(num) ? null : String(num);
    }).filter(p => p !== null);

    if (parts.length === 0) return null;
    // Sort and remove duplicates
    return [...new Set(parts)].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
  }

  // Single value
  const match = str.match(/^Caso\s+(\d+)/i);
  if (match) return match[1];
  const num = parseInt(str);
  return isNaN(num) ? null : String(num);
}

// Import CSV (admin only)
router.post('/import', verifyToken, requireAdmin, csvUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const results = [];
  const errors = [];
  let lineNumber = 0;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ separator: ';', headers: false }))
        .on('data', (row) => {
          lineNumber++;

          // Get values by index (array-like access)
          const values = Object.values(row);

          // Skip header row if present (handle UTF-8 BOM)
          const firstVal = values[0]?.replace(/^\uFEFF/, '').toLowerCase();
          if (lineNumber === 1 && (firstVal === 'caso' || firstVal === 'casos')) {
            return;
          }

          // Map columns by position:
          // 0: Casos (number, "Caso X", "1,2,3", "*" for global, or empty for unassigned)
          // 1: Nombre del caso
          // 2: Nombre del personaje
          // 3: Oficio o filiación
          // 4: Descripción
          // 5: Prompt
          // 6: image_file
          // 7: Categoría (optional)
          // 8: Es informante (optional, 1/0 or true/false)
          const casosRaw = values[0]?.trim();
          const casosValue = casosRaw === '*' ? '*' : (casosRaw === '' ? '' : normalizeCasos(casosRaw));

          // Parse es_informante: accept 1, "1", "true", "si", "sí"
          const esInformanteRaw = values[8]?.trim()?.toLowerCase();
          const esInformante = esInformanteRaw === '1' || esInformanteRaw === 'true' || esInformanteRaw === 'si' || esInformanteRaw === 'sí' ? 1 : 0;

          const character = {
            casos: casosValue,
            nombre_caso: values[1]?.trim() || '',
            nombre: values[2]?.trim() || null,
            oficio: values[3]?.trim() || null,
            descripcion: values[4]?.trim() || null,
            prompt: values[5]?.trim() || null,
            image_file: values[6]?.trim() || null,
            categoria: values[7]?.trim() || 'Sin categoría',
            es_informante: esInformante
          };

          if (!character.nombre) {
            errors.push({ line: lineNumber, error: 'Missing required field (Nombre)', data: values.slice(0, 3) });
          } else {
            results.push(character);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert characters into database
    let inserted = 0;
    let updated = 0;

    for (const character of results) {
      await new Promise((resolve, reject) => {
        // Check if character already exists (by nombre - same character might be in multiple cases)
        db.get(
          'SELECT id FROM characters WHERE nombre = ? AND nombre_caso = ?',
          [character.nombre, character.nombre_caso],
          (err, existing) => {
            if (err) {
              reject(err);
              return;
            }

            if (existing) {
              // Update existing
              db.run(
                `UPDATE characters SET casos = ?, oficio = ?, descripcion = ?, prompt = ?, image_file = ?, categoria = ?, es_informante = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [character.casos, character.oficio, character.descripcion, character.prompt, character.image_file, character.categoria, character.es_informante, existing.id],
                (err) => {
                  if (err) reject(err);
                  else {
                    updated++;
                    resolve();
                  }
                }
              );
            } else {
              // Insert new
              db.run(
                `INSERT INTO characters (casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, categoria, es_informante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [character.casos, character.nombre_caso, character.nombre, character.oficio, character.descripcion, character.prompt, character.image_file, character.categoria, character.es_informante],
                (err) => {
                  if (err) reject(err);
                  else {
                    inserted++;
                    resolve();
                  }
                }
              );
            }
          }
        );
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Import completed',
      inserted,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error processing CSV file' });
  }
});

// Export all characters as CSV
router.get('/export', verifyToken, requireGameAccess, (req, res) => {
  db.all('SELECT * FROM characters ORDER BY casos ASC, nombre ASC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const csvHeader = 'Casos;Nombre del caso;Nombre;Oficio o filiación;Descripción;Prompt;image_file;Categoría;Es informante\n';
    const csvRows = rows.map(row => {
      return [
        row.casos || '',
        escapeCsvField(row.nombre_caso || ''),
        escapeCsvField(row.nombre),
        escapeCsvField(row.oficio || ''),
        escapeCsvField(row.descripcion || ''),
        escapeCsvField(row.prompt || ''),
        row.image_file || '',
        escapeCsvField(row.categoria || 'Sin categoría'),
        row.es_informante ? '1' : '0'
      ].join(';');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sherlock-characters.csv"');
    res.send('\ufeff' + csvContent); // BOM for Excel compatibility
  });
});

// Export characters by case number
router.get('/export/:caso', verifyToken, requireGameAccess, (req, res) => {
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

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No characters found for this case' });
    }

    const nombreCaso = rows[0].nombre_caso || `Caso ${caso}`;
    const filename = `Caso ${caso} ${nombreCaso}.csv`.replace(/[/\\?%*:|"<>]/g, '-');

    const csvHeader = 'Casos;Nombre del caso;Nombre;Oficio o filiación;Descripción;Prompt;image_file;Categoría;Es informante\n';
    const csvRows = rows.map(row => {
      return [
        row.casos || '',
        escapeCsvField(row.nombre_caso || ''),
        escapeCsvField(row.nombre),
        escapeCsvField(row.oficio || ''),
        escapeCsvField(row.descripcion || ''),
        escapeCsvField(row.prompt || ''),
        row.image_file || '',
        escapeCsvField(row.categoria || 'Sin categoría'),
        row.es_informante ? '1' : '0'
      ].join(';');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csvContent);
  });
});

// Helper function to escape CSV fields
function escapeCsvField(field) {
  if (!field) return '';
  // If field contains semicolon, newline or quotes, wrap in quotes and escape internal quotes
  if (field.includes(';') || field.includes('\n') || field.includes('"')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

module.exports = router;
