/**
 * Migration script to convert single game_pin to 10 case-specific PINs
 *
 * Run with: node src/utils/migratePins.js
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../sherlock.db');
const db = new sqlite3.Database(dbPath);

// Default PINs for each case (can be changed in admin panel)
const DEFAULT_PINS = {
  pin_caso_1: '1895',   // Year of first Sherlock Holmes story publication
  pin_caso_2: '221B',   // Baker Street address
  pin_caso_3: '1887',   // Year of A Study in Scarlet
  pin_caso_4: '1891',   // Year of The Final Problem
  pin_caso_5: '1894',   // Year of The Empty House
  pin_caso_6: '1902',   // Year of The Hound of the Baskervilles
  pin_caso_7: '1903',   // Year of The Adventure of the Empty House
  pin_caso_8: '1904',   // Year of The Return of Sherlock Holmes
  pin_caso_9: '1905',   // Continuing the theme
  pin_caso_10: '1927',  // Year of The Case-Book of Sherlock Holmes
};

console.log('Starting PIN migration...');
console.log('Database:', dbPath);

db.serialize(() => {
  // Check if we already have the new PIN structure
  db.get("SELECT value FROM settings WHERE key = 'pin_caso_1'", [], (err, row) => {
    if (row) {
      console.log('Migration already applied - pin_caso_1 exists');
      db.close();
      return;
    }

    // Get current game_pin value
    db.get("SELECT value FROM settings WHERE key = 'game_pin'", [], (err, oldPin) => {
      const currentPin = oldPin?.value || '1895';
      console.log('Current game_pin:', currentPin);

      // Insert new PIN entries
      const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

      for (let i = 1; i <= 10; i++) {
        const key = `pin_caso_${i}`;
        // Use current PIN for case 1, defaults for others
        const value = i === 1 ? currentPin : DEFAULT_PINS[key];
        stmt.run(key, value);
        console.log(`  Set ${key} = ${value}`);
      }

      stmt.finalize();

      // Optionally remove old game_pin (keep it for backwards compatibility)
      // db.run("DELETE FROM settings WHERE key = 'game_pin'");

      console.log('\nMigration completed successfully!');
      console.log('\nPIN structure:');
      console.log('  PIN Caso 1 -> Access to Case 1');
      console.log('  PIN Caso 2 -> Access to Cases 1-2');
      console.log('  PIN Caso 3 -> Access to Cases 1-3');
      console.log('  ... and so on');

      db.close();
    });
  });
});
