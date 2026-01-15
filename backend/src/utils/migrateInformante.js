const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sherlock.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Migración: Añadir campo es_informante ===\n');

// Categorías que indican que un personaje global es informante
const CATEGORIAS_INFORMANTES = [
  'Informantes',
  'Prensa',
  'Archivos',
  'Policía',
  'Servicios',
  'Medicina',
  'Legal',
  'Bajos fondos',
  'Vecindario',
  'Otros',
];

db.serialize(() => {
  // Verificar si la columna ya existe
  db.all("PRAGMA table_info(characters)", (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      return;
    }

    const hasEsInformante = columns.some(col => col.name === 'es_informante');

    if (hasEsInformante) {
      console.log('La columna "es_informante" ya existe. Migración completada anteriormente.');
      db.close();
      return;
    }

    console.log('Añadiendo columna "es_informante"...');

    // Añadir columna es_informante (0 = false, 1 = true)
    db.run(`ALTER TABLE characters ADD COLUMN es_informante INTEGER DEFAULT 0`, (err) => {
      if (err) {
        console.error('Error añadiendo columna:', err);
        db.close();
        return;
      }

      console.log('Columna añadida. Migrando datos existentes...\n');

      // Marcar como informantes a los personajes globales con categorías de informante
      const placeholders = CATEGORIAS_INFORMANTES.map(() => '?').join(',');
      const query = `UPDATE characters SET es_informante = 1 WHERE casos = '*' AND categoria IN (${placeholders})`;

      db.run(query, CATEGORIAS_INFORMANTES, function(err) {
        if (err) {
          console.error('Error migrando datos:', err);
        } else {
          console.log(`${this.changes} personajes marcados como informantes.`);
        }

        // Mostrar resumen
        db.all(`SELECT es_informante, COUNT(*) as count FROM characters WHERE casos = '*' GROUP BY es_informante`, [], (err, rows) => {
          if (err) {
            console.error('Error en resumen:', err);
          } else {
            console.log('\nResumen de personajes globales:');
            rows.forEach(row => {
              console.log(`  ${row.es_informante ? 'Informantes' : 'No informantes (Baker Street, etc.)'}: ${row.count}`);
            });
          }
          console.log('\n=== Migración completada ===');
          db.close();
        });
      });
    });
  });
});
