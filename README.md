# Tempo

Personal music player with FastAPI + Postgres backend and a React PWA frontend.

## Features
- FastAPI backend with SQLAlchemy 2, Alembic, Postgres 16
- Local storage for audio files in a Docker volume (`/data/media`)
- PWA frontend with offline playlists stored in IndexedDB
- Range-enabled streaming for smooth seeking
- Session-based auth (login + HttpOnly cookie)

## Repo Structure
```
.
├── apps
│   ├── api
│   │   ├── alembic
│   │   ├── app
│   │   ├── tests
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   └── web
│       ├── public
│       ├── src
│       ├── Dockerfile
│       └── package.json
├── scripts
├── Caddyfile
├── Caddyfile.dev
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
└── README.md
```

## Local Development (HTTP)
1. Copy envs:
   ```
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```
2. Create at least one user with the helper script:
   ```
   python scripts/create_user.py --username your-username
   ```
3. Start dev stack:
   ```
   docker compose -f docker-compose.dev.yml up --build
   ```
3. Open `http://localhost` (Caddy proxy) or `http://localhost:5173` (Vite).

## Production / VPS (HTTPS)
1. Set envs (`.env` and `apps/api/.env`), including:
   - `DOMAIN=yourdomain.com`
   - `CADDY_EMAIL=you@yourdomain.com`
   - `BASE_URL=https://yourdomain.com`
2. Start production stack:
   ```
   docker compose up --build
   ```
Caddy will obtain TLS certificates automatically.

## VPS Quickstart (Docker)
1. Install Docker + Docker Compose on the VPS.
2. Clone the repo and enter it:
   ```
   git clone <your-repo-url>
   cd media-player
   ```
3. Create env files from examples:
   ```
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```
4. Edit envs for production (minimum):
   - `DOMAIN=yourdomain.com`
   - `CADDY_EMAIL=you@yourdomain.com`
   - `BASE_URL=https://yourdomain.com`
   - `AUTH_SECRET=use-a-strong-secret`
   - `AUTH_COOKIE_SECURE=true`
   - `CORS_ORIGINS=https://yourdomain.com`
5. Start:
   ```
   docker compose up -d --build
   ```
6. Verify:
   - `https://yourdomain.com`
   - `https://yourdomain.com/api/health`

Note: `.env` files are not committed; use `.env.example` as a template.

## Uploading Music
Audio files are read from `/data/media` inside the API container (Docker volume `media_data`).
Supported formats: `.mp3`, `.m4a`, `.opus`.

Options:
- Copy into the volume:
  ```
  docker compose exec api mkdir -p /data/media
  docker cp /path/to/music/. $(docker compose ps -q api):/data/media
  ```
- Or mount a host folder to the volume (adjust compose if desired).

After adding files, scan (example with cookie session):
```
curl -c cookies.txt -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"yourpassword"}'
curl -b cookies.txt -X POST http://localhost/api/tracks/scan
```

## Offline Playlists
1. Open the PWA and sign in.
2. Go to Playlists → Download.
3. Tracks are stored in IndexedDB and played offline.
4. If iOS purges data, use **Repair downloads** to re-validate and re-fetch.

## Useful Commands
- `make build` / `make up` / `make down`
- `make logs`
- `make db-migrate`
- `make create-admin-token`
- `make create-user username=your-username`

## Run
```
docker compose up --build
```
