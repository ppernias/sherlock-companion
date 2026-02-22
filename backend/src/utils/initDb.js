const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Use DB_PATH env var for Docker, otherwise default to project root
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sherlock.db');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

db.serialize(() => {
  // Characters table (casos as TEXT for multiple cases like "1,2,3" or "*" for global or empty for unassigned)
  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      casos TEXT DEFAULT '',
      nombre_caso TEXT DEFAULT '',
      nombre TEXT NOT NULL,
      oficio TEXT,
      descripcion TEXT,
      prompt TEXT,
      image_file TEXT,
      categoria TEXT DEFAULT 'Sin categoría',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating characters table:', err);
    else console.log('Characters table created/verified');
  });

  // Settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating settings table:', err);
    else console.log('Settings table created/verified');
  });

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating admins table:', err);
    else console.log('Admins table created/verified');
  });

  // Create indexes for search
  db.run(`CREATE INDEX IF NOT EXISTS idx_characters_nombre ON characters(nombre)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_characters_oficio ON characters(oficio)`);

  // Insert default settings - 10 PINs for progressive case access
  const DEFAULT_PINS = {
    pin_caso_1: process.env.GAME_PIN || '1895',
    pin_caso_2: '221B',
    pin_caso_3: '1887',
    pin_caso_4: '1891',
    pin_caso_5: '1894',
    pin_caso_6: '1902',
    pin_caso_7: '1903',
    pin_caso_8: '1904',
    pin_caso_9: '1905',
    pin_caso_10: '1927',
  };

  // Insert all 10 PINs
  for (let i = 1; i <= 10; i++) {
    const key = `pin_caso_${i}`;
    const value = DEFAULT_PINS[key];
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value], (err) => {
      if (err) console.error(`Error setting ${key}:`, err);
      else console.log(`${key} set to: ${value}`);
    });
  }

  // Keep legacy game_pin for backwards compatibility
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('game_pin', ?)`, [DEFAULT_PINS.pin_caso_1]);

  // Create default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sherlock.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'holmes221b';
  const saltRounds = 10;

  db.get('SELECT id FROM admins WHERE email = ?', [adminEmail], (err, row) => {
    if (err) {
      console.error('Error checking admin:', err);
      db.close();
      return;
    }

    if (row) {
      console.log(`Admin user already exists: ${adminEmail}`);
      console.log('\nDatabase initialization complete!');
      db.close();
      return;
    }

    bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        db.close();
        return;
      }

      db.run(`INSERT INTO admins (email, password_hash) VALUES (?, ?)`,
        [adminEmail, hash],
        (err) => {
          if (err) console.error('Error creating admin:', err);
          else console.log(`Admin user created: ${adminEmail}`);

          console.log('\nDatabase initialization complete!');
          console.log('-----------------------------------');
          console.log('Game PINs (progressive access):');
          for (let i = 1; i <= 10; i++) {
            console.log(`  Case ${i}: ${DEFAULT_PINS[`pin_caso_${i}`]} (access to cases 1-${i})`);
          }
          console.log(`Admin email: ${adminEmail}`);
          console.log(`Admin password: ${adminPassword}`);
          console.log('-----------------------------------');

          db.close();
        }
      );
    });
  });
});
