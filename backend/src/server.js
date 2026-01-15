const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const caseRoutes = require('./routes/cases');
const importExportRoutes = require('./routes/import-export');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');
const openaiRoutes = require('./routes/openai');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Trust proxy for nginx reverse proxy (1 = trust first proxy only)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false // Disable validation to avoid trust proxy errors
});
app.use('/api/', limiter);

// Serve uploaded images via /img route for nginx compatibility
// Uses URL without extension to bypass nginx static file rules
app.get('/img/:filename', (req, res) => {
  let filename = req.params.filename;
  // If no extension, try adding common image extensions
  const filepath = path.join(__dirname, 'uploads', 'images', filename);

  const fs = require('fs');
  if (fs.existsSync(filepath)) {
    return res.sendFile(filepath);
  }
  // Try with .png extension
  if (fs.existsSync(filepath + '.png')) {
    return res.sendFile(filepath + '.png');
  }
  // Try with .jpg extension
  if (fs.existsSync(filepath + '.jpg')) {
    return res.sendFile(filepath + '.jpg');
  }
  // Try with .jpeg extension
  if (fs.existsSync(filepath + '.jpeg')) {
    return res.sendFile(filepath + '.jpeg');
  }
  res.status(404).json({ error: 'Image not found' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api', importExportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/openai', openaiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Sherlock Companion Backend running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API endpoint: http://${HOST}:${PORT}/api`);
});

module.exports = app;
