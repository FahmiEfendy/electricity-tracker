# Electricity Tracker — Changelog

All notable changes to the application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-07-20

### 🎉 First Stable Release
Promoted to production after six iterative pre-release versions covering core CRUD functionality, 
bug fixes, performance improvements, and a full security hardening pass (input validation, CSRF 
protection, rate limiting, security headers, graceful shutdown).

No functional changes since `0.6.0` — this release marks the application as stable and 
production-ready. Full development history is documented below in `[0.1.0]`–`[0.6.0]`.

---

## [0.6.0] — 2026-07-20

### Security
- **Production-ready Docker Compose security hardening (`docker-compose.yml`)** — Configured `cap_drop: ALL` (drops Linux capabilities), `read_only: true` (read-only root filesystem with `tmpfs: /tmp` mount), `no-new-privileges:true` (prevents privilege escalation), memory reservation/limits (`128M`/`256M`), and `json-file` log rotation (`max-size: 10m`, `max-file: 3`) to prevent host disk exhaustion and container escapes.
- **CSRF protection (`src/lib/csrf.ts`)** — Added `verifySameOrigin()` helper enforcing Same-Origin checks on all state-changing API routes (`POST`, `PUT`, `DELETE`). Cross-origin mutation requests are rejected with HTTP 403. Inspects `Origin` and `Referer` headers against `Host`/`X-Forwarded-Host`.
- **Rate limiting (`src/lib/rateLimit.ts`)** — Implemented in-memory sliding-window rate limiter: 5 req/min on `/api/auth` (prevents brute-force login) and 30 req/min on mutation endpoints. Returns HTTP 429 with `Retry-After` header when exceeded. Background GC purges expired entries every 5 minutes.
- **Security headers (`next.config.ts`)** — Applied `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (`max-age=31536000; includeSubDomains; preload`), and Content-Security-Policy to all routes via Next.js `headers()`.

### Added
- **Graceful shutdown (`src/lib/prisma.ts`)** — Registered `SIGTERM` and `SIGINT` handlers to cleanly disconnect Prisma (`$disconnect()`) and drain the `pg.Pool` (`pool.end()`) before process exit. Guarded with `isShuttingDown` flag to prevent duplicate executions.
- **Production DB migration entrypoint (`docker-entrypoint.sh`)** — New container entrypoint script that runs `npx prisma migrate deploy` automatically before starting the Next.js server. Ensures schema migrations are always applied on deploy without manual intervention.
- **Updated Dockerfile** — Production `runner` stage now copies Prisma schema, migrations directory, and CLI into the image so `migrate deploy` can run at container startup.
- **Database seeder (`prisma/seed.ts`)** — Updated seeder with 181 real meter readings spanning January 1, 2026 to June 30, 2026 (exported directly from production database). Uses idempotent `upsert` so it is safe to run multiple times. Seed command registered in `prisma.config.ts` for `npm run db:seed`.

---

## [0.5.0] — 2026-07-20

### Security
- **Input validation & sanitization (`src/lib/validations.ts`)** — Added Zod schema validation across all server-side API routes. `GET /api/readings` query parameters (`month` 1–12, `year` 2024–2030, `limit` 1–500, `offset` ≥ 0, `sort`) are validated before hitting the database. `POST /api/readings` and `PUT /api/readings/[id]` reject non-positive `meterKwh`, negative `buyKwh`, invalid dates, and notes over 500 characters. `PUT /api/settings` rejects non-positive or non-numeric tariff values. All routes return structured 400 responses via `formatZodError()`.
- **Import payload guards (`api/import/route.ts`)** — Added 5 MB request body size limit and 5,000-row maximum per import to prevent resource exhaustion.
- **ID parameter hardening (`api/readings/[id]/route.ts`)** — `PUT` and `DELETE` now validate that the `id` param is a non-empty string before querying the database.
- **JSON parse guard** — `POST /api/readings`, `PUT /api/readings/[id]`, and `PUT /api/settings` now return a structured 400 error when the request body is not valid JSON, rather than letting the parse exception surface as a 500.

### Added
- **React error boundary (`src/app/error.tsx`)** — Segment-level error boundary. Catches runtime exceptions in route components and renders a themed fallback card with "Try Again" (`reset()`) and "Go to Home" recovery options. Error digest is shown for support tracing.
- **Global error boundary (`src/app/global-error.tsx`)** — Root layout error boundary. Catches critical failures inside `RootLayout` and renders a self-contained HTML/body fallback page with a "Reload Application" button.
- **Custom 404 page (`src/app/not-found.tsx`)** — Styled not-found page for invalid routes, matching the app's dark theme.

### Fixed
- **`set-state-in-effect` lint error (`ReadingsTable.tsx`)** — Replaced `useEffect`-based prop sync (which triggered the lint rule) with a render-time state comparison pattern (`prevProps` ref).

---

## [0.4.0] — 2026-07-20

### Performance
- **Server-side pagination** — `GET /api/readings` now accepts `limit`, `offset`, and `sort` query parameters. ReadingsTable fetches only the current page from the server instead of loading all rows client-side.
- **Backfill moved to writes** — `backfillEstimatedReadings()` is no longer called on every `GET /api/readings`. It now runs only after data mutations: `POST /api/readings`, `PUT /api/readings/:id`, `DELETE /api/readings/:id`, and `POST /api/import`. Reduced `GET` latency from ~22s to sub-100ms for typical data volumes.
- **Single API request on page load** — `GET /api/readings` response now includes `allReadings` (lightweight `{id, recordedAt, kwhUsed, costRp}` for all rows, unfiltered) alongside paginated `data` and `total`. Eliminated the duplicate API call previously fired separately for charts and summary cards.

### Fixed
- **Spinner not animating (Safari/Webkit)** — CSS `@keyframes spin` was missing `-webkit-` prefix. Fixed in `globals.css`.
- **Import/submit button spinner invisible** — Loading spinner on primary (dark) buttons was dark-on-dark. Changed to white (`border-t-white / border-white`).
- **Month filter incomplete** — Month dropdown was built from only the first 15 rows (one page), so months outside the initial page were missing. Now populated from `allReadings` (all rows, lightweight) returned with every API response.
- **Redundant fetch on mount** — ReadingsTable fired a duplicate `fetchTableData` on first mount even when `initialReadings` props were already provided. First paint now uses props directly; fetches only fire when filters, page, or sort change.

---

## [0.3.0] — 2026-07-16

### Added
- **`isEstimated` field on `MeterReading`** — persists whether a row was auto-filled for a missing calendar day, rather than computing this client-side on every page load
- **Server-side gap backfill (`lib/backfillEstimates.ts`)** — `GET /api/readings` now detects calendar-day gaps between real readings and persists an estimated row for each missing day directly to the database (flat-rate linear interpolation, same formula previously computed client-side only). Wrapped in a Postgres advisory lock (`pg_advisory_lock`) so concurrent requests serialize instead of racing, with a unique constraint on `recordedAt` as a backstop
- **Buy kWh auto-suggestion (`DataEntryForm.tsx`)** — when a new meter reading is higher than the previous one (implying a token purchase), the Buy kWh field auto-fills a suggested value. The suggestion checks the 5 nearest candidate multiples of 11.5 (the token purchase unit) around the raw meter jump and picks whichever implies a consumption rate closest to the median rate of the last 8 real readings, rather than a single blended estimate that can snap to the wrong multiple. Recomputes on either the meter reading or date field changing, in any order. Only activates once the date field has been deliberately set (not left at today's default), since elapsed time against the wrong anchor date produces nonsensical suggestions
- **Buy kWh input step** — number input step set to `11.5` (`lib/utils.ts` → `BUY_KWH_UNIT`) in both the New Reading form and inline edit row, so the native spinner increments/decrements by one purchase unit

### Fixed
- **Corrupted timestamps from a prior bulk import** — spot-checked and corrected at least one row (2026-03-01) where `recordedAt` didn't match the source spreadsheet; if reported values look off, cross-check `recordedAt`/`hourDiff` against the original source, since more rows from that import may carry similar drift

---

## [0.2.0] — 2026-07-14

### Fixed
- **Prepaid meter calculation bug** — kWh used was calculated as `current - previous` (postpaid logic), causing negative values whenever a reading was saved or edited. Corrected to `(previousMeter + buyKwh) - currentMeter` across all three calculation paths: `POST /api/readings`, `PUT /api/readings/[id]`, and `lib/recalculate.ts`
- **Database repair** — All historical records were recalculated via `prisma/recalculate-all.ts` using the corrected formula
- **Latest reading tariff display** — The most recent (chronologically last) reading had its `kwhUsed`, `costRp`, and `hourDiff` hidden on the frontend because no subsequent reading exists to compute them against. Data is preserved in the database; display only is suppressed
- **Month dropdown width** — Month filter select in the Readings Table was stretching full-width due to `.input-field { width: 100% }` CSS rule; overridden with inline `width: auto`
- **Duplicate constant** — Removed redundant `thisMonthStart` in `calculateSummary()` (was identical to `monthStart`); now uses `monthStart` directly for last-month range check
- **Variable shadowing** — `localISO` computed at render time in `DataEntryForm` was shadowed inside `setToNow`; refactored into shared `getLocalISO()` helper used consistently in all three places
- **Loading state header** — `<Header>` rendered during loading state was missing `onShowImport` prop, preventing the Import dropdown from working while data was fetching

### Added
- **Profile dropdown in header** — Replaced standalone Logout button with a profile avatar circle. Shows first letter of admin email. Dropdown contains: 📥 Import Spreadsheet Data and 🚪 Logout. Click-outside closes the dropdown
- **Header layout order** — Admin badge → Email → Profile circle (with dropdown)
- **🕒 Now button** — Added to the Date & Time field in both New Reading form and inline Edit row to instantly set the datetime picker to the current local time
- **Monthly Report restructured** — Columns reordered to: Month → Entries → Avg kWh/Day → Total kWh → Avg Cost/Day → Total Cost. Added `avgDailyCost` computed field
- **Entries progress format** — Entries column now displays `{recorded} / {total days in month}` (e.g. `14/31`) using `new Date(year, month + 1, 0).getDate()` for correct leap-year handling

### Changed
- **Import button relocated** — "Import Spreadsheet Data" button removed from below the New Reading form; now accessible via the profile dropdown in the header
- **Footer text** — Simplified to "Built with Next.js"

---

## [0.1.0] — 2026-06-22

### Added
- Next.js 16 full-stack application with App Router
- PostgreSQL database integration via Prisma ORM with migration support
- NextAuth credential-based authentication with admin login
- Middleware-protected routes (dashboard requires authentication)
- Meter reading CRUD (create, read, update, delete)
- Automatic calculation of kWh usage, cost (Rupiah), and time difference between readings
- Configurable electricity tariff via settings API
- Historical data visualization with Recharts
- Excel file import for bulk meter reading data
- Multi-stage Dockerfile (Node.js 22 Alpine → standalone output)
- Non-root user (`nextjs`) in production container
- Prisma database seeder for admin user and default tariff
- GitHub Actions CI/CD pipeline — builds and pushes to GHCR on `main` branch
