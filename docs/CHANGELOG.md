# Electricity Tracker — Changelog

All notable changes to the application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- Add `docs/` folder with README, CHANGELOG, TEST_CHECKLIST, TODO
- Production-ready Docker Compose with security hardening

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
