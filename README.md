# Sherlock Companion

Audiovisual companion for the board game **Sherlock Holmes Consulting Detective** (Sherlock Holmes Investigador Asesor).

Manage and display game characters with their images and AI-generated content during gameplay.

## Features

- Character management with categories and case assignments
- Global characters (Baker Street regulars and Informants)
- AI-powered prompt and image generation (OpenAI)
- CSV import/export for bulk character management
- Game mode for players (PIN protected)
- Admin panel for character management
- Victorian/detective themed UI

## Quick Start with Docker

### 1. Clone the repository

```bash
git clone https://github.com/ppernias/sherlock-companion.git
cd sherlock-companion
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your values:
- `JWT_SECRET`: Change to a secure random string
- `OPENAI_API_KEY`: Your OpenAI API key (optional, for AI features)

### 3. Start the application

```bash
docker-compose up -d
```

### 4. Initialize the database (first run only)

```bash
docker-compose exec backend npm run init-db
```

### 5. Access the application

- **Game Mode**: http://localhost:3000 (PIN: `1895`)
- **Admin Panel**: http://localhost:3000/admin
  - Email: `admin@sherlock.local`
  - Password: `holmes221b`

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after updates
docker-compose up -d --build

# Reset database
docker-compose exec backend npm run reset-db
```

## Data Persistence

Data is stored in Docker volumes:
- `sherlock-data`: SQLite database
- `sherlock-images`: Uploaded character images

### Backup

```bash
docker run --rm -v sherlock-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/sherlock-backup.tar.gz -C /data .
```

### Restore

```bash
docker run --rm -v sherlock-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/sherlock-backup.tar.gz -C /data
```

## Manual Installation

See [CLAUDE.md](CLAUDE.md) for detailed installation instructions without Docker.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| JWT_SECRET | Secret key for JWT tokens | (required) |
| GAME_PIN | PIN for game access | 1895 |
| ADMIN_EMAIL | Default admin email | admin@sherlock.local |
| ADMIN_PASSWORD | Default admin password | holmes221b |
| OPENAI_API_KEY | OpenAI API key | (optional) |
| FRONTEND_PORT | Frontend port | 3000 |

## CSV Import Format

Characters can be imported via CSV with semicolon separator:

```csv
Casos;Nombre del caso;Nombre;Oficio;Descripcion;Prompt;image_file;Categoria;Es informante
1;Case Name;Character Name;Profession;Description;AI Prompt;image.png;Category;0
```

## License

MIT

## Version

v2.1.0
