const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use DB_PATH env var for Docker, otherwise default to project root
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sherlock.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.run('PRAGMA foreign_keys = ON');

module.exports = db;
