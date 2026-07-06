# Electricity Tracker — Test Checklist

Run through this checklist after every deployment or significant code change.

---

## 1. Pre-Deployment

- [ ] **Container is built and pushed to GHCR**
  ```bash
  docker pull ghcr.io/fahmiefendy/electricity-tracker:latest
  ```
  **Expected:** Image pulls successfully

- [ ] **Environment variables are configured**
  ```bash
  cat apps/electricity-tracker/app/.env
  ```
  **Expected:** All required variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) are set

- [ ] **Container starts without errors**
  ```bash
  docker compose up -d et-app
  docker logs et-app --tail 20
  ```
  **Expected:** Next.js starts on port 3000 without Prisma or database errors

---

## 2. Health & Availability

- [ ] **App is reachable**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://electricity.fahmiefendy.dev/
  ```
  **Expected:** `200` (redirects to login if not authenticated)

- [ ] **Container is on the proxy network**
  ```bash
  docker network inspect proxy --format '{{range .Containers}}{{.Name}} {{end}}' | grep et-app
  ```
  **Expected:** `et-app` appears in the list

- [ ] **Database connection is active**
  ```bash
  docker exec et-app wget -q -O - http://localhost:3000/ 2>&1 | head -5
  ```
  **Expected:** Returns HTML content (not a database error page)

---

## 3. Authentication

- [ ] **Login page loads**
  Open `http://electricity.fahmiefendy.dev/login` in a browser
  **Expected:** Login form renders with email and password fields

- [ ] **Login with valid admin credentials**
  Enter the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`
  **Expected:** Redirected to dashboard, session cookie set

- [ ] **Reject invalid credentials**
  Enter wrong email or password
  **Expected:** Error message shown, remains on login page

- [ ] **Protected routes redirect unauthenticated users**
  Open `http://electricity.fahmiefendy.dev/` without being logged in
  **Expected:** Redirected to `/login`

- [ ] **Logout works**
  Click logout / sign out
  **Expected:** Session cleared, redirected to login

- [ ] **Session persists on refresh**
  After login, refresh the page
  **Expected:** User remains authenticated

---

## 4. Meter Readings

- [ ] **Dashboard displays readings**
  Navigate to dashboard after login
  **Expected:** Table of meter readings shown (or empty state if no data)

- [ ] **Create a new reading**
  Add a new meter reading with kWh value and optional notes
  **Expected:** Reading created, appears in the table with calculated fields

- [ ] **Calculations are correct**
  Create two readings with known values
  **Expected:**
  - `hourDiff` = time difference between readings in hours
  - `kwhUsed` = difference in meter kWh between readings
  - `costRp` = kwhUsed × current tariff

- [ ] **Update a reading**
  Edit an existing meter reading
  **Expected:** Changes saved, table updated

- [ ] **Delete a reading**
  Delete a meter reading and confirm
  **Expected:** Reading removed from table

---

## 5. Settings

- [ ] **View current tariff**
  Navigate to settings (or check via API)
  ```bash
  curl -s http://electricity.fahmiefendy.dev/api/settings -H "Cookie: <session_cookie>" | jq .
  ```
  **Expected:** Returns current tariff value

- [ ] **Update tariff**
  Change the electricity tariff value
  **Expected:** New tariff saved, future cost calculations use the new rate

---

## 6. Data Import

- [ ] **Import from Excel**
  Upload an Excel file with meter reading data
  **Expected:** Readings imported, appear in the dashboard table

- [ ] **Reject invalid file format**
  Upload a non-Excel file or Excel with wrong columns
  **Expected:** Error message shown, no data imported

---

## 7. Charts & Visualization

- [ ] **Charts render with data**
  View the dashboard with multiple readings
  **Expected:** Recharts graphs display kWh usage and cost trends over time

- [ ] **Charts handle empty state**
  View the dashboard with no readings
  **Expected:** Empty state or placeholder shown (no crash)

---

## 8. Error Handling

- [ ] **API returns proper error codes**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://electricity.fahmiefendy.dev/api/readings
  ```
  **Expected:** `401` (unauthenticated)

- [ ] **Invalid reading data returns validation error**
  Submit a reading with missing required fields
  **Expected:** `400` or `422` with error message

---

## 9. Rollback

- [ ] **Previous image can be restored**
  ```bash
  docker compose pull et-app
  docker compose up -d et-app
  docker logs et-app --tail 10
  ```
  **Expected:** Container starts with previous version, app loads correctly
