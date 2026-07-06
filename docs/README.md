# Electricity Tracker — App

## Overview

Next.js 16 full-stack application for tracking household electricity consumption. Features meter reading input, cost calculation based on configurable tariffs, historical data visualization with charts, and Excel import/export. Authentication is handled via NextAuth with credential-based admin login.

**Container name:** `et-app`
**Image:** `ghcr.io/fahmiefendy/electricity-tracker:latest`
**Port:** `3000` (internal Next.js)
**Runtime:** Node.js 22 (Alpine, standalone output)
**Public URL:** `electricity.fahmiefendy.dev`

## Architecture

```
Browser → Cloudflare → infra-nginx → et-app:3000 (Next.js standalone)
                                       ├── /            → SSR pages (dashboard, login)
                                       ├── /api/auth/*  → NextAuth endpoints
                                       ├── /api/readings/* → Meter reading CRUD
                                       ├── /api/settings/* → Tariff settings
                                       └── /api/import/*   → Excel import
                                                          ↓
                                                    db-postgres:5432
```

## Directory Structure

```
app/
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── page.tsx          # Dashboard (meter readings, charts)
│   │   ├── login/            # Login page
│   │   ├── api/
│   │   │   ├── auth/         # NextAuth credential provider
│   │   │   ├── readings/     # Meter reading CRUD endpoints
│   │   │   ├── settings/     # Tariff configuration endpoints
│   │   │   └── import/       # Excel import endpoint
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Tailwind CSS v4 styles
│   ├── auth.ts               # NextAuth configuration
│   ├── auth.config.ts        # Auth provider config
│   ├── middleware.ts          # NextAuth middleware (route protection)
│   ├── components/           # React components
│   └── lib/                  # Utilities (Prisma client, helpers)
├── prisma/
│   ├── schema.prisma         # Database schema (Settings, MeterReading)
│   ├── seed.ts               # Database seeder (admin user, default tariff)
│   └── migrations/           # Prisma migration files
├── public/                   # Static assets
├── Dockerfile                # Multi-stage build (Node.js 22 Alpine → standalone)
├── nginx.conf                # Reference Nginx config for reverse proxy
├── docs/                     # Documentation
└── .github/workflows/
    └── deploy.yml            # CI/CD — build & push to GHCR
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL server hostname | `localhost` | Yes |
| `DB_PORT` | PostgreSQL server port | `5432` | No |
| `DB_USER` | PostgreSQL username | `postgres` | Yes |
| `DB_PASSWORD` | PostgreSQL password | — | Yes |
| `DB_NAME` | PostgreSQL database name | `electricity_tracker` | Yes |
| `DB_SCHEMA` | PostgreSQL schema | `public` | No |
| `AUTH_SECRET` | NextAuth secret (run `openssl rand -hex 32`) | — | Yes |
| `AUTH_TRUST_HOST` | Trust the host header (required behind proxy) | `true` | Yes |
| `ADMIN_EMAIL` | Admin login email | — | Yes |
| `ADMIN_PASSWORD` | Admin login password | — | Yes |

## API Endpoints

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/signin` | Login with admin credentials | No |
| `POST` | `/api/auth/signout` | Logout | Yes |
| `GET` | `/api/auth/session` | Get current session | No |

### Meter Readings
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/readings` | List all readings (paginated) | Yes |
| `POST` | `/api/readings` | Create a new meter reading | Yes |
| `PATCH` | `/api/readings/:id` | Update a reading | Yes |
| `DELETE` | `/api/readings/:id` | Delete a reading | Yes |

### Settings
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/settings` | Get current tariff settings | Yes |
| `PUT` | `/api/settings` | Update tariff settings | Yes |

### Import
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/import` | Import readings from Excel file | Yes |

## Local Development

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed the database (creates admin user and default tariff)
npm run db:seed

# Start development server (hot reload on port 3000)
npm run dev
```

## Docker Deployment

The container is built and pushed via GitHub Actions on every push to `main`. On the homeserver:

```bash
# Start the app stack
cd /path/to/homeserver/apps/electricity-tracker
docker compose up -d

# View logs
docker logs et-app --tail 50 -f

# Check the app is serving
curl -s -o /dev/null -w "%{http_code}" http://electricity.fahmiefendy.dev/
```

## Database

Uses PostgreSQL (`db-postgres`) from the shared `databases/` stack via the `proxy` network. The Prisma schema defines two models:

| Model | Table | Description |
|-------|-------|-------------|
| `Setting` | `settings` | Key-value store for tariff configuration |
| `MeterReading` | `meter_readings` | Individual meter readings with calculated cost |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection refused | Verify `db-postgres` is running and on the `proxy` network. Check `DB_HOST` in `.env` |
| Prisma migration errors | Run `npx prisma migrate deploy` inside the container or check schema compatibility |
| Auth errors / redirect loops | Verify `AUTH_SECRET` is set and `AUTH_TRUST_HOST=true` (required behind reverse proxy) |
| 502 from nginx | Check container is running: `docker ps --filter name=et-app` |
| Blank page after deploy | Check `docker logs et-app` for Next.js startup errors |
| Excel import fails | Verify file format matches expected columns and file size is within limits |

## Related Files

- [docker-compose.yml](../../docker-compose.yml) — Service definition
- [Dockerfile](../Dockerfile) — Multi-stage container build
- [nginx.conf](../nginx.conf) — Reference Nginx config
- [deploy.yml](../.github/workflows/deploy.yml) — CI/CD pipeline
- [schema.prisma](../prisma/schema.prisma) — Database schema
