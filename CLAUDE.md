# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sherlock Companion v2.3.0** is a web application for the board game "Sherlock Holmes Consulting Detective" (Sherlock Holmes Investigador Asesor). It serves as an audiovisual companion for managing and displaying game characters with their images and AI-generated content.

## Key Concepts

### Character Types
- **Case Characters**: Assigned to specific cases (casos = "1", "1,2,3")
- **Global Characters**: Available in all cases (casos = "*")
  - **Informantes**: Global characters marked as informants (es_informante = true) - shown in "Informantes" section
  - **Baker Street**: Global characters NOT marked as informants (es_informante = false) - shown in "Baker Street" section
- **Unassigned Characters**: Not yet assigned to any case (casos = "")

### Categories
All characters can have a category (Legal, Prensa, Medicina, Servicios, etc.) regardless of their case assignment. Categories help organize characters for easier searching.

Hidden categories (admin only): `Jugadores`

## Architecture

### Backend (Node.js + Express)
- **Location:** `/backend`
- **Port:** 3001
- **Database:** SQLite (`sherlock.db`)
- **Entry point:** `src/server.js`

Key directories:
- `src/routes/` - API endpoints (auth, characters, cases, import-export, upload, settings, openai)
- `src/middleware/` - JWT authentication middleware
- `src/config/` - Database configuration
- `src/uploads/images/` - Uploaded character images
- `src/utils/` - Database initialization, reset, and migration scripts

### Frontend (React + Material-UI)
- **Location:** `/frontend`
- **Port:** 3000
- **Entry point:** `src/App.js`

Key directories:
- `src/pages/` - PinPage, LoginPage, GameMode, AdminPanel
- `src/contexts/` - AuthContext for authentication state
- `src/services/` - API client (axios)
- `src/styles/` - MUI theme (Victorian/detective style)

## Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd sherlock-companion

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings (especially OPENAI_API_KEY)

# Start with Docker Compose
docker-compose up -d

# Initialize the database (first run only)
docker-compose exec backend npm run init-db

# Access the application at http://localhost:3000
```

### Option 2: Manual Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure your .env file
npm run init-db       # Initialize database
npm run dev           # Start development server

# Frontend (in another terminal)
cd frontend
npm install
npm start             # Start development server
```

## Common Commands

### Development

```bash
# Backend
cd backend
npm install
npm run dev          # Start with nodemon (hot reload)
npm run init-db      # Initialize database (first run)
npm run reset-db     # Reset database (keeps admins)
npm run reset-db --reset-admins  # Full reset including admins

# Frontend
cd frontend
npm install
npm start            # Development server
npm run build        # Production build (requires extra memory)
NODE_OPTIONS="--max-old-space-size=1024" npm run build
```

### Production (PM2)

```bash
# Start services
pm2 start backend/src/server.js --name sherlock-backend
pm2 start "serve -s build -l 3000" --name sherlock-frontend --cwd frontend

# Manage services
pm2 list
pm2 logs sherlock-backend
pm2 restart sherlock-backend
pm2 save             # Persist for auto-restart on reboot
```

### Docker Commands

```bash
# Start/stop
docker-compose up -d
docker-compose down

# View logs
docker-compose logs -f
docker-compose logs -f backend

# Rebuild after code changes
docker-compose up -d --build

# Reset database in Docker
docker-compose exec backend npm run reset-db
docker-compose exec backend npm run reset-db --reset-admins

# Access container shell
docker-compose exec backend sh
```

### Testing endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Verify PIN (default: 1895)
curl -X POST http://localhost:3001/api/auth/pin \
  -H "Content-Type: application/json" \
  -d '{"pin":"1895"}'

# Admin login (default: admin@sherlock.local / holmes221b)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sherlock.local","password":"holmes221b"}'
```

## Authentication

Two access levels:
1. **Game PINs:** 10 progressive PINs for search/view mode (GameMode)
   - PIN for case N grants access to cases 1 through N
   - Example: PIN for case 3 allows viewing cases 1, 2, and 3
2. **Admin:** Email/password for full management (AdminPanel - CRUD, import/export, AI generation)

Default credentials:
- Game PINs (progressive access):
  - Case 1: `1895` (access to case 1)
  - Case 2: `221B` (access to cases 1-2)
  - Case 3: `1887` (access to cases 1-3)
  - Case 4: `1891` (access to cases 1-4)
  - Case 5: `1894` (access to cases 1-5)
  - Case 6: `1902` (access to cases 1-6)
  - Case 7: `1903` (access to cases 1-7)
  - Case 8: `1904` (access to cases 1-8)
  - Case 9: `1905` (access to cases 1-9)
  - Case 10: `1927` (access to all cases)
- Admin: `admin@sherlock.local` / `holmes221b`

## Database Schema

**characters table:**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| casos | TEXT | Case numbers ("1", "1,2,3"), "*" for global, "" for unassigned |
| nombre_caso | TEXT | Case name (only for case-specific characters) |
| nombre | TEXT | Character name (required) |
| oficio | TEXT | Character profession/role |
| descripcion | TEXT | Character description |
| prompt | TEXT | AI prompt for image generation |
| image_file | TEXT | Image filename |
| categoria | TEXT | Category (Legal, Prensa, Medicina, etc.) |
| es_informante | INTEGER | 1 if informant, 0 otherwise (only for global characters) |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

**settings table:**
- key, value (stores pin_caso_1 through pin_caso_10 for progressive access)

**admins table:**
- id, email, password_hash, created_at

## CSV Format

Import/Export uses semicolon-separated fields with 9 columns:
```
Casos;Nombre del caso;Nombre;Oficio o filiación;Descripción;Prompt;image_file;Categoría;Es informante
```

Examples:
```csv
1;El magnate de armamentos;Inspector Lestrade;Inspector de policía;Detective de Scotland Yard;;lestrade.png;Policía;0
*;;Langdale Pike;Informador social;Informador de la alta sociedad;;;Otros;1
*;;Sherlock Holmes;Detective consultor;El famoso detective;;;Baker Street;0
```

Field details:
- **Casos**: "1", "1,2,3" (multiple cases), "*" (global), "" (unassigned)
- **Es informante**: "1", "true", "si", "sí" = informant; "0", "false", empty = not informant

## API Endpoints

### Authentication
- `POST /api/auth/pin` - Verify game PIN
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify JWT token

### Characters
- `GET /api/characters` - List/search characters
  - Query params: `caso`, `nombre`, `oficio`, `categoria`, `search`, `includeUnassigned`, `excludeGlobal`, `limit`, `offset`
- `GET /api/characters/:id` - Get single character
- `POST /api/characters` - Create character (admin)
- `PUT /api/characters/:id` - Update character (admin)
- `DELETE /api/characters/:id` - Delete character (admin)

### Cases
- `GET /api/cases` - List unique cases (excludes global characters)

### Import/Export
- `POST /api/import` - Import CSV (admin)
- `GET /api/export` - Export all as CSV
- `GET /api/export/:caso` - Export case as CSV

### Images
- `POST /api/upload` - Upload image (admin)
- `GET /img/:filename` - Serve image (no extension needed)

### Settings
- `GET /api/settings/pins` - Get all 10 case PINs (admin)
- `PUT /api/settings/pins` - Update case PINs (admin, body: { pins: { 1: "PIN1", 2: "PIN2", ... } })
- `GET /api/settings/pin` - Get case 1 PIN (admin, legacy)
- `PUT /api/settings/pin` - Update case 1 PIN (admin, legacy)
- `PUT /api/settings/password` - Change admin password
- `GET /api/settings/stats` - Get statistics (admin)
- `GET /api/settings/admins` - List admins (admin)
- `POST /api/settings/admins` - Create admin (admin)
- `DELETE /api/settings/admins/:id` - Delete admin (admin)

### OpenAI Integration
- `POST /api/openai/generate-prompt` - Generate character prompt using GPT-4o-mini
- `POST /api/openai/generate-image` - Generate character image using GPT-Image-1.5

### Backup/Restore
- `GET /api/backup` - Download complete backup (ZIP with CSV + images)
- `GET /api/backup/stats` - Get backup statistics (character count, image count, size)
- `POST /api/backup/validate` - Validate backup ZIP before restore
- `POST /api/backup/restore` - Restore from backup ZIP (modes: merge, replace)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| JWT_SECRET | Secret key for JWT tokens | (required) |
| PORT | Backend server port | 3001 |
| DB_PATH | SQLite database path | ./sherlock.db |
| GAME_PIN | Default game PIN | 1895 |
| ADMIN_EMAIL | Default admin email | admin@sherlock.local |
| ADMIN_PASSWORD | Default admin password | holmes221b |
| OPENAI_API_KEY | OpenAI API key for AI features | (optional) |

## Image Handling

Images are served via `/img/:filename` route without file extension. This bypasses issues with nginx static file rules. The backend automatically detects the correct file extension.

Example: `/img/lestrade` will serve `lestrade.png` or `lestrade.jpg`

## Data Persistence (Docker)

Docker volumes are used for data persistence:
- `sherlock-data`: SQLite database
- `sherlock-images`: Uploaded character images

### Application Backup (Recommended)

Use the built-in backup system in AdminPanel → Import/Export → Backup Completo:
- Downloads a ZIP file with all characters, images, and settings
- Can be restored via the same interface
- Supports merge or replace modes

### Docker Volume Backup (Advanced)

```bash
docker run --rm -v sherlock-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/sherlock-backup.tar.gz -C /data .
```

To restore:
```bash
docker run --rm -v sherlock-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/sherlock-backup.tar.gz -C /data
```

## Backup ZIP Structure

```
sherlock-backup-YYYY-MM-DDTHH-MM-SS.zip
├── personajes.csv      # All characters (CSV format)
├── settings.json       # Configuration (game PIN)
├── metadata.json       # Backup info (version, date, stats)
└── images/             # Referenced images only
    ├── character-*.png # Manually uploaded images
    └── gptimg-*.png    # AI-generated images
```

## Database Migrations

Migration scripts are located in `backend/src/utils/`:
- `migrateCategoria.js` - Adds `categoria` field
- `migrateInformante.js` - Adds `es_informante` field
- `migratePins.js` - Converts single game_pin to 10 case-specific PINs

Run migrations manually if upgrading:
```bash
cd backend
# From v1.x:
node src/utils/migrateCategoria.js
node src/utils/migrateInformante.js
# From v2.2.0 or earlier:
node src/utils/migratePins.js
```

## Version History

### v2.3.0
- **Progressive PIN System**: 10 case-specific PINs for progressive access
  - Each PIN grants access to cases 1 through N (PIN for case 5 = access to cases 1-5)
  - Default PINs themed around Sherlock Holmes dates (1895, 221B, 1887, etc.)
  - All 10 PINs configurable in Admin Settings
- **GameMode**: Shows access level indicator (e.g., "Casos 1-5")
- **GameMode**: Filters characters and cases based on access level
- **API**: New endpoints `GET/PUT /api/settings/pins` for managing all 10 PINs
- **Migration**: `migratePins.js` to convert existing single PIN to 10 PINs

### v2.2.0
- **Backup System**: Complete backup/restore functionality
  - Download ZIP with all characters, images, and settings
  - Validate backup before restore
  - Restore modes: merge (update/add) or replace (full reset)
- **API**: New endpoints `/api/backup`, `/api/backup/stats`, `/api/backup/validate`, `/api/backup/restore`
- **AdminPanel**: New "Backup Completo" section in Import/Export tab
- **Image naming**: `character-*` for uploads, `gptimg-*` for AI-generated

### v2.1.0
- **GameMode**: Fixed character limit (increased to 500) to show all characters including Holmes and Scotland Yard
- **AdminPanel**: Improved filter with separate options for global subtypes:
  - "Globales (todos)" - All global characters
  - "Solo Informantes" - Global characters with es_informante=true
  - "Solo Baker Street" - Global characters with es_informante=false
- **AdminPanel**: Smart sorting when viewing globals - sorts by type (Baker Street/Informante), then category, then name
- **AdminPanel**: Renamed "Caso" column to "Tipo/Caso" for clarity
- **AdminPanel**: Increased character limit to 500

### v2.0.0
- Added `categoria` field for all characters
- Added `es_informante` field for global characters
- Separated Baker Street (non-informants) from Informantes sections in GameMode
- AdminPanel shows distinct chips for Informante/Global/Case characters
- Import/Export updated with new fields
- Strict case filtering in AdminPanel (excludes globals)
- Fixed CSV import UTF-8 BOM handling for Excel files

### v1.0.0
- Initial release with basic character management
- Global characters (informantes) support
- AI prompt and image generation
- CSV import/export
