const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'sherlock.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating database: caso field from INTEGER to TEXT...');

db.serialize(() => {
  // Create new table with TEXT field for casos
  db.run(`
    CREATE TABLE IF NOT EXISTS characters_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      casos TEXT NOT NULL,
      nombre_caso TEXT NOT NULL,
      nombre TEXT NOT NULL,
      oficio TEXT,
      descripcion TEXT,
      prompt TEXT,
      image_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      process.exit(1);
    }
    console.log('New table created');
  });

  // Copy data, converting integer to string
  db.run(`
    INSERT INTO characters_new (id, casos, nombre_caso, nombre, oficio, descripcion, prompt, image_file, created_at, updated_at)
    SELECT id, CAST(caso AS TEXT), nombre_caso, nombre, oficio, descripcion, prompt, image_file, created_at, updated_at
    FROM characters
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err);
      process.exit(1);
    }
    console.log('Data copied');
  });

  // Drop old table
  db.run(`DROP TABLE characters`, (err) => {
    if (err) {
      console.error('Error dropping old table:', err);
      process.exit(1);
    }
    console.log('Old table dropped');
  });

  // Rename new table
  db.run(`ALTER TABLE characters_new RENAME TO characters`, (err) => {
    if (err) {
      console.error('Error renaming table:', err);
      process.exit(1);
    }
    console.log('Table renamed');
  });

  // Create index for search
  db.run(`CREATE INDEX IF NOT EXISTS idx_characters_nombre ON characters(nombre)`, (err) => {
    if (err) console.error('Error creating index:', err);
    else console.log('Index created');

    console.log('\nMigration complete!');
    console.log('Field "caso" renamed to "casos" and now supports multiple values like "1,2,3"');
    db.close();
  });
});
