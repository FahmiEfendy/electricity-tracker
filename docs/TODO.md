# Electricity Tracker — TODO

## 🔴 Critical

- [ ] **Database migrations in production** — Run `prisma migrate deploy` automatically on container startup or via CI/CD
- [ ] **CSRF protection** — Verify NextAuth CSRF token handling is active for all mutation endpoints
- [ ] **Input validation & sanitization** — Add server-side validation on all API routes (reading values, tariff, import data)
- [ ] **Rate limiting** — Add rate limiting to auth endpoints to prevent brute-force attacks
- [ ] **Security headers** — Configure Next.js `headers()` in `next.config.ts` for CSP, X-Frame-Options, HSTS
- [ ] **Error boundary** — Add React error boundary to prevent white-screen crashes
- [ ] **Graceful shutdown** — Handle `SIGTERM`/`SIGINT` to close database connections cleanly

## 🟡 Medium

- [ ] **Date range filtering** — Filter readings by date range (month, quarter, year)
- [ ] **Export to Excel** — Export current readings data back to Excel format
- [ ] **Multiple users** — Support multiple user accounts with separate data isolation
- [ ] **Tariff history** — Track tariff changes over time and apply correct tariff per reading period
- [ ] **Automated tests** — Add Jest/Vitest tests for API routes and Prisma queries
- [ ] **CI test pipeline** — Run tests in GitHub Actions before building the Docker image
- [ ] **Toast notifications** — Add proper success/error feedback for user actions (currently inline)
- [ ] **Database backup** — Document and schedule PostgreSQL backup strategy for electricity data

## 🟢 Nice to Have

- [ ] **PWA support** — Add `manifest.json` and service worker for offline access
- [ ] **Budget alerts** — Notify when projected monthly cost exceeds a threshold
- [ ] **Analytics dashboard** — More detailed charts (daily averages, peak usage hours, cost trends)
- [ ] **API documentation** — Generate OpenAPI/Swagger docs from API routes
- [ ] **Audit logging** — Log all data mutations with user and timestamp
- [ ] **Data archival** — Archive old readings after a configurable retention period
- [ ] **Multi-tenancy** — Support tracking multiple meters or properties
