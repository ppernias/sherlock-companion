const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'sherlock.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Migración: Añadir campo categoria ===\n');

// Categorías que se consideraban "de caso" vs "de categoría"
const CATEGORIAS_VALIDAS = [
  'Baker Street',
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
  'Jugadores',
  'Sin categoría',
];

db.serialize(() => {
  // Verificar si la columna ya existe
  db.all("PRAGMA table_info(characters)", (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      return;
    }

    const hasCategoria = columns.some(col => col.name === 'categoria');

    if (hasCategoria) {
      console.log('La columna "categoria" ya existe. Migración completada anteriormente.');
      db.close();
      return;
    }

    console.log('Añadiendo columna "categoria"...');

    // Añadir columna categoria
    db.run(`ALTER TABLE characters ADD COLUMN categoria TEXT DEFAULT 'Sin categoría'`, (err) => {
      if (err) {
        console.error('Error añadiendo columna:', err);
        db.close();
        return;
      }

      console.log('Columna añadida. Migrando datos existentes...\n');

      // Obtener todos los personajes globales para migrar su nombre_caso a categoria
      db.all(`SELECT id, casos, nombre_caso FROM characters WHERE casos = '*'`, [], (err, rows) => {
        if (err) {
          console.error('Error leyendo personajes:', err);
          db.close();
          return;
        }

        if (rows.length === 0) {
          console.log('No hay personajes globales para migrar.');
          console.log('\n=== Migración completada ===');
          db.close();
          return;
        }

        console.log(`Encontrados ${rows.length} personajes globales para migrar.\n`);

        let migrated = 0;
        let pending = rows.length;

        rows.forEach((row) => {
          // Si el nombre_caso es una categoría válida, usarla como categoria
          // y limpiar el nombre_caso
          let categoria = 'Sin categoría';
          let nombreCaso = row.nombre_caso;

          if (CATEGORIAS_VALIDAS.includes(row.nombre_caso)) {
            categoria = row.nombre_caso;
            nombreCaso = ''; // Limpiar porque era usado como categoría
          }

          db.run(
            `UPDATE characters SET categoria = ?, nombre_caso = ? WHERE id = ?`,
            [categoria, nombreCaso, row.id],
            function(err) {
              if (err) {
                console.error(`Error migrando personaje ${row.id}:`, err);
              } else if (this.changes > 0) {
                migrated++;
                console.log(`  Migrado ID ${row.id}: categoria="${categoria}"`);
              }

              pending--;
              if (pending === 0) {
                console.log(`\n${migrated} personajes migrados.`);
                console.log('\n=== Migración completada ===');
                db.close();
              }
            }
          );
        });
      });
    });
  });
});
