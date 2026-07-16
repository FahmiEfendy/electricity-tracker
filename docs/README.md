# Electricity Tracker — App

## Overview

Next.js 16 full-stack application for tracking household **prepaid electricity meter** consumption. Features meter reading input, cost calculation based on configurable tariffs, historical data visualization with charts, and CSV/Excel import. Authentication is handled via NextAuth with credential-based admin login.

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
                                       └── /api/import/*   → CSV/Excel import
                                                          ↓
                                                    db-postgres:5432
```

## Directory Structure

```
app/
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── page.tsx          # Dashboard (meter readings, charts, summary)
│   │   ├── login/            # Login page
│   │   ├── api/
│   │   │   ├── auth/         # NextAuth credential provider
│   │   │   ├── readings/     # Meter reading CRUD endpoints
│   │   │   ├── settings/     # Tariff configuration endpoints
│   │   │   └── import/       # CSV/Excel import endpoint
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Tailwind CSS v4 styles
│   ├── auth.ts               # NextAuth configuration
│   ├── auth.config.ts        # Auth provider config
│   ├── middleware.ts          # NextAuth middleware (route protection)
│   ├── components/           # React components
│   │   ├── Header.tsx        # Sticky topbar with profile dropdown
│   │   ├── DataEntryForm.tsx # New reading form with "Now" time button
│   │   ├── ReadingsTable.tsx # Paginated readings table with month filter
│   │   ├── MonthlyReport.tsx # Monthly summary (entries/days, avg, totals)
│   │   ├── UsageChart.tsx    # Daily/monthly bar & line charts
│   │   ├── SummaryCards.tsx  # Today / week / month / last month cards
│   │   ├── MasterDataPanel.tsx # Tariff settings panel
│   │   └── ImportDataModal.tsx # CSV import modal
│   └── lib/                  # Utilities
│       ├── prisma.ts         # Prisma client singleton (pg adapter)
│       ├── recalculate.ts    # Derived field recalculation helper
│       ├── backfillEstimates.ts # Server-side gap-fill (runs on every GET /api/readings)
│       └── utils.ts          # Formatting helpers (Rupiah, kWh, dates), BUY_KWH_UNIT constant
├── prisma/
│   ├── schema.prisma         # Database schema (Settings, MeterReading)
│   ├── seed.ts               # Database seeder (default tariff)
│   ├── recalculate-all.ts    # One-off script to repair all historical records
│   └── migrations/           # Prisma migration files
├── public/                   # Static assets
├── Dockerfile                # Multi-stage build (Node.js 22 Alpine → standalone)
├── nginx.conf                # Reference Nginx config for reverse proxy
├── docs/                     # Documentation
└── .github/workflows/
    └── deploy.yml            # CI/CD — build & push to GHCR
```

## Key Business Logic

### Prepaid Meter Calculation
This app tracks a **prepaid electricity meter** where the balance decreases as electricity is consumed and increases when tokens (kWh) are purchased. The formula used is:

```
kwhUsed = (previousMeter + buyKwh) - currentMeter
costRp  = kwhUsed × tariff_per_kwh
```

> ⚠️ This is the **opposite** of a postpaid meter. Do not change this formula to `current - previous`.

### Latest Reading Suppression
The chronologically newest reading has its `kwhUsed`, `costRp`, and `hourDiff` hidden on the frontend (set to `null` in `fetchReadings`) because no subsequent reading exists to calculate them against. The raw values are preserved in the database unchanged.

### Missing-Day Backfill
`GET /api/readings` calls `backfillEstimatedReadings()` before returning data. It scans real (`isEstimated: false`) readings for calendar-day gaps and persists a flat-rate linear-interpolated row (`isEstimated: true`) for each missing day, so the returned data has no gaps without requiring a reading every single day. This runs on every request, so it's wrapped in a Postgres advisory lock (serializes concurrent calls) with a `@@unique([recordedAt])` constraint as a backstop — do not remove either without replacing the concurrency protection, since this combination directly resolved a prior data-corruption incident (see CHANGELOG 0.3.0).

### Buy kWh Suggestion
Token/credit purchases are always sold in multiples of `BUY_KWH_UNIT` (11.5 kWh). When a new meter reading is higher than the previous one, `DataEntryForm` suggests a Buy kWh value: it evaluates the 5 nearest 11.5-multiples around the raw meter jump and picks whichever implies a consumption rate closest to the median of the last 8 real readings' kWh/hour — the raw jump alone always understates the true purchase, since `meterKwh = previousMeter + buyKwh - consumed` and consumption during the gap eats into the same delta. This is a suggestion only; admins can always overwrite it before saving.

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
| `GET` | `/api/readings` | List readings (supports `limit`, `offset`, `month`, `year`) | No |
| `POST` | `/api/readings` | Create a new meter reading | Yes |
| `PUT` | `/api/readings/:id` | Update a reading (recalculates next reading too) | Yes |
| `DELETE` | `/api/readings/:id` | Delete a reading (recalculates next reading too) | Yes |

### Settings
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/settings` | Get current tariff | No |
| `PUT` | `/api/settings` | Update tariff | Yes |

### Import
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/import` | Import readings from CSV/Excel | Yes |

## Local Development

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed the database (default tariff Rp 1791.3/kWh)
npm run db:seed

# Start development server (hot reload on port 3000)
npm run dev
```

### Repair Historical Data
If calculation formulas are changed, recalculate all historical records:
```bash
npx tsx prisma/recalculate-all.ts
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

### MeterReading Fields
| Field | Type | Description |
|-------|------|-------------|
| `recordedAt` | DateTime | When the reading was taken |
| `meterKwh` | Float | Current meter balance in kWh |
| `buyKwh` | Float? | Token purchased at this reading (optional) |
| `hourDiff` | Float? | Hours since previous reading (calculated) |
| `kwhUsed` | Float? | kWh consumed since previous reading (calculated) |
| `costRp` | Float? | Cost in Rupiah (calculated) |
| `tariffAtEntry` | Float? | Tariff snapshot at time of entry |
| `notes` | String? | Optional notes |
| `isEstimated` | Boolean | `true` if auto-filled by the missing-day backfill, not a real user entry (default `false`) |

`recordedAt` has a unique constraint — the backfill relies on this to prevent duplicate rows for the same day under concurrent requests.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection refused | Verify `db-postgres` is running and on the `proxy` network. Check `DB_HOST` in `.env` |
| Prisma migration errors | Run `npx prisma migrate deploy` inside the container or check schema compatibility |
| Auth errors / redirect loops | Verify `AUTH_SECRET` is set and `AUTH_TRUST_HOST=true` (required behind reverse proxy) |
| 502 from nginx | Check container is running: `docker ps --filter name=et-app` |
| Blank page after deploy | Check `docker logs et-app` for Next.js startup errors |
| Import fails | Verify CSV columns match: `Date, kWh, Time, Hour Difference, Buy kWh, kWh Used, Cost (Rp), Notes` |
| Negative kWh values after edit | Run `npx tsx prisma/recalculate-all.ts` to repair all derived fields |
| Duplicate/estimated rows for the same day | Should not happen with the unique constraint + advisory lock in place (see CHANGELOG 0.3.0). If it does, check that both the `@@unique([recordedAt])` migration and the `pg_advisory_lock` wrapper in `lib/backfillEstimates.ts` are actually deployed — this combination is load-bearing, not optional hardening |
| Buy kWh suggestion looks way off | Check the previous reading's `recordedAt` and recent `hourDiff`/`kwhUsed` values for corruption (e.g. from a bad historical import) — the suggestion is only as good as those inputs. A single wrong timestamp on the previous reading is enough to shift it to the wrong 11.5-multiple |

## Related Files

- [docker-compose.yml](../../docker-compose.yml) — Service definition
- [Dockerfile](../Dockerfile) — Multi-stage container build
- [nginx.conf](../nginx.conf) — Reference Nginx config
- [deploy.yml](../.github/workflows/deploy.yml) — CI/CD pipeline
- [schema.prisma](../prisma/schema.prisma) — Database schema
