# Electricity Tracker — Changelog

All notable changes to the application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- Production-ready Docker Compose with security hardening

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
