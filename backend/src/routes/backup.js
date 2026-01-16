const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const multer = require('multer');
const db = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Configure multer for ZIP uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/backups');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `backup-upload-${Date.now()}.zip`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos ZIP'), false);
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

const IMAGES_DIR = path.join(__dirname, '../uploads/images');

// GET /api/backup - Generate and download complete backup
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get all characters
    const characters = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM characters ORDER BY casos, nombre', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Get settings
    const settings = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Get referenced images
    const referencedImages = characters
      .map(c => c.image_file)
      .filter(img => img && img.trim() !== '');

    // Create metadata
    const metadata = {
      version: '2.1.0',
      created_at: new Date().toISOString(),
      stats: {
        total_characters: characters.length,
        total_images: referencedImages.length,
        cases: [...new Set(characters.map(c => c.casos).filter(c => c && c !== '*' && c !== ''))]
      }
    };

    // Generate CSV content
    const csvHeader = 'Casos;Nombre del caso;Nombre;Oficio o filiación;Descripción;Prompt;image_file;Categoría;Es informante';
    const csvRows = characters.map(c => {
      const fields = [
        c.casos || '',
        c.nombre_caso || '',
        c.nombre || '',
        c.oficio || '',
        (c.descripcion || '').replace(/;/g, ',').replace(/\n/g, ' '),
        (c.prompt || '').replace(/;/g, ',').replace(/\n/g, ' '),
        c.image_file || '',
        c.categoria || 'Sin categoría',
        c.es_informante ? '1' : '0'
      ];
      return fields.join(';');
    });
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Generate settings JSON
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });

    // Create ZIP
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sherlock-backup-${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error creating backup' });
      }
    });

    archive.pipe(res);

    // Add CSV
    archive.append(csvContent, { name: 'personajes.csv' });

    // Add settings
    archive.append(JSON.stringify(settingsObj, null, 2), { name: 'settings.json' });

    // Add metadata
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    // Add images
    for (const imgFile of referencedImages) {
      const imgPath = path.join(IMAGES_DIR, imgFile);
      if (fs.existsSync(imgPath)) {
        archive.file(imgPath, { name: `images/${imgFile}` });
      }
    }

    await archive.finalize();

  } catch (err) {
    console.error('Backup error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generating backup' });
    }
  }
});

// GET /api/backup/stats - Get current stats for backup preview
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT
          COUNT(*) as total_characters,
          COUNT(CASE WHEN image_file IS NOT NULL AND image_file != '' THEN 1 END) as with_images
        FROM characters
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Calculate total size of images
    const characters = await new Promise((resolve, reject) => {
      db.all('SELECT image_file FROM characters WHERE image_file IS NOT NULL AND image_file != ""', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    let totalSize = 0;
    for (const c of characters) {
      const imgPath = path.join(IMAGES_DIR, c.image_file);
      if (fs.existsSync(imgPath)) {
        totalSize += fs.statSync(imgPath).size;
      }
    }

    res.json({
      total_characters: stats.total_characters,
      total_images: stats.with_images,
      estimated_size: totalSize
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Error getting stats' });
  }
});

// POST /api/backup/validate - Validate backup ZIP before restore
router.post('/validate', verifyToken, requireAdmin, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo ZIP' });
    }

    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Check required files
    const hasCSV = zipEntries.some(e => e.entryName === 'personajes.csv');
    const hasMetadata = zipEntries.some(e => e.entryName === 'metadata.json');
    const hasSettings = zipEntries.some(e => e.entryName === 'settings.json');

    if (!hasCSV) {
      fs.unlinkSync(zipPath);
      return res.status(400).json({ error: 'El backup no contiene personajes.csv' });
    }

    // Parse CSV to get stats
    const csvContent = zip.readAsText('personajes.csv');
    const lines = csvContent.split('\n').filter(l => l.trim());
    const characterCount = lines.length - 1; // Exclude header

    // Get image files in backup
    const imageEntries = zipEntries.filter(e => e.entryName.startsWith('images/'));
    const imageCount = imageEntries.length;

    // Parse metadata if exists
    let metadata = null;
    if (hasMetadata) {
      try {
        metadata = JSON.parse(zip.readAsText('metadata.json'));
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }

    // Get total size
    let totalSize = 0;
    zipEntries.forEach(e => { totalSize += e.header.size; });

    // Clean up uploaded file (will re-upload on restore)
    fs.unlinkSync(zipPath);

    res.json({
      valid: true,
      stats: {
        characters: characterCount,
        images: imageCount,
        has_settings: hasSettings,
        total_size: totalSize,
        backup_version: metadata?.version || 'unknown',
        backup_date: metadata?.created_at || null
      }
    });

  } catch (err) {
    console.error('Validation error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error validating backup: ' + err.message });
  }
});

// POST /api/backup/restore - Restore from backup ZIP
router.post('/restore', verifyToken, requireAdmin, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo ZIP' });
    }

    const mode = req.body.mode || 'merge'; // 'merge' or 'replace'
    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);

    // Validate ZIP structure
    const hasCSV = zip.getEntries().some(e => e.entryName === 'personajes.csv');
    if (!hasCSV) {
      fs.unlinkSync(zipPath);
      return res.status(400).json({ error: 'El backup no contiene personajes.csv' });
    }

    // If replace mode, delete all existing data
    if (mode === 'replace') {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM characters', [], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Parse and import CSV
    const csvContent = zip.readAsText('personajes.csv');
    const lines = csvContent.split('\n').filter(l => l.trim());

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(';');

      if (values.length < 3) continue;

      const character = {
        casos: values[0]?.replace(/^\uFEFF/, '')?.trim() || '',
        nombre_caso: values[1]?.trim() || '',
        nombre: values[2]?.trim() || '',
        oficio: values[3]?.trim() || '',
        descripcion: values[4]?.trim() || '',
        prompt: values[5]?.trim() || '',
        image_file: values[6]?.trim() || '',
        categoria: values[7]?.trim() || 'Sin categoría',
        es_informante: ['1', 'true', 'si', 'sí'].includes(values[8]?.trim()?.toLowerCase()) ? 1 : 0
      };

      if (!character.nombre) continue;

      try {
        // Check if character exists (by name)
        const existing = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM characters WHERE nombre = ?', [character.nombre], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (existing) {
          // Update
          await new Promise((resolve, reject) => {
            db.run(`
              UPDATE characters SET
                casos = ?, nombre_caso = ?, oficio = ?, descripcion = ?,
                prompt = ?, image_file = ?, categoria = ?, es_informante = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [
              character.casos, character.nombre_caso, character.oficio, character.descripcion,
              character.prompt, character.image_file, character.categoria, character.es_informante,
              existing.id
            ], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          updated++;
        } else {
          // Insert
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO characters (casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, categoria, es_informante)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              character.casos, character.nombre_caso, character.nombre, character.oficio,
              character.descripcion, character.prompt, character.image_file, character.categoria, character.es_informante
            ], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          inserted++;
        }
      } catch (err) {
        errors.push({ line: i + 1, nombre: character.nombre, error: err.message });
      }
    }

    // Restore images
    let imagesRestored = 0;
    let imagesMissing = [];

    const imageEntries = zip.getEntries().filter(e => e.entryName.startsWith('images/'));

    for (const entry of imageEntries) {
      const imgName = path.basename(entry.entryName);
      const targetPath = path.join(IMAGES_DIR, imgName);

      try {
        zip.extractEntryTo(entry, IMAGES_DIR, false, true);
        imagesRestored++;
      } catch (err) {
        imagesMissing.push(imgName);
      }
    }

    // Restore settings if present and in replace mode
    if (mode === 'replace') {
      try {
        const settingsContent = zip.readAsText('settings.json');
        const settings = JSON.parse(settingsContent);

        for (const [key, value] of Object.entries(settings)) {
          if (key === 'game_pin') {
            await new Promise((resolve, reject) => {
              db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        }
      } catch (e) {
        console.log('No settings to restore or error:', e.message);
      }
    }

    // Clean up
    fs.unlinkSync(zipPath);

    res.json({
      success: true,
      stats: {
        inserted,
        updated,
        images_restored: imagesRestored,
        images_missing: imagesMissing.length,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Only return first 10 errors
    });

  } catch (err) {
    console.error('Restore error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error restoring backup: ' + err.message });
  }
});

module.exports = router;
