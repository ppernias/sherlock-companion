#!/usr/bin/env node
/**
 * Reset Database Script
 *
 * This script completely resets the database:
 * - Deletes all characters
 * - Deletes all uploaded images
 * - Resets settings to defaults
 * - Keeps admin users (or resets them with --reset-admins flag)
 *
 * Usage:
 *   node resetDb.js              # Reset data but keep admins
 *   node resetDb.js --reset-admins   # Reset everything including admins
 *   node resetDb.js --help       # Show help
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Sherlock Companion - Database Reset Tool

Usage:
  node resetDb.js              Reset data but keep admin users
  node resetDb.js --reset-admins   Reset everything including admins
  node resetDb.js --help       Show this help message

This will:
  - Delete all characters from the database
  - Delete all uploaded images
  - Reset game PIN to default (from .env or 1895)
  ${args.includes('--reset-admins') ? '- Reset admin users to default' : '- Keep existing admin users'}
`);
  process.exit(0);
}

const resetAdmins = args.includes('--reset-admins');
// Use DB_PATH env var for Docker, otherwise default to project root
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sherlock.db');
const imagesPath = path.join(__dirname, '..', 'uploads', 'images');

console.log('===========================================');
console.log('  Sherlock Companion - Database Reset');
console.log('===========================================\n');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.log('Database does not exist. Run "npm run init-db" first.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

console.log('Resetting database...\n');

db.serialize(() => {
  // Delete all characters
  db.run('DELETE FROM characters', function(err) {
    if (err) console.error('Error deleting characters:', err);
    else console.log(`Deleted ${this.changes} characters`);
  });

  // Reset settings
  const gamePin = process.env.GAME_PIN || '1895';
  db.run('DELETE FROM settings', (err) => {
    if (err) console.error('Error deleting settings:', err);
  });
  db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['game_pin', gamePin], (err) => {
    if (err) console.error('Error resetting PIN:', err);
    else console.log(`Game PIN reset to: ${gamePin}`);
  });

  // Reset admins if requested
  if (resetAdmins) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sherlock.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'holmes221b';

    db.run('DELETE FROM admins', function(err) {
      if (err) console.error('Error deleting admins:', err);
      else console.log(`Deleted ${this.changes} admin users`);
    });

    bcrypt.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }

      db.run('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [adminEmail, hash], (err) => {
        if (err) console.error('Error creating admin:', err);
        else console.log(`Admin user recreated: ${adminEmail}`);

        finishReset();
      });
    });
  } else {
    console.log('Admin users preserved');
    finishReset();
  }
});

function finishReset() {
  // Delete uploaded images
  if (fs.existsSync(imagesPath)) {
    const files = fs.readdirSync(imagesPath);
    let deletedCount = 0;
    files.forEach(file => {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(imagesPath, file));
        deletedCount++;
      }
    });
    console.log(`Deleted ${deletedCount} uploaded images`);
  }

  console.log('\n===========================================');
  console.log('  Database reset complete!');
  console.log('===========================================');
  console.log('\nThe application is ready for a fresh start.');
  console.log('Import characters via CSV or add them manually.\n');

  db.close();
}
