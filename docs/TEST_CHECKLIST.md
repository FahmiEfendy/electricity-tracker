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
  **Expected:** Redirected to dashboard; header shows Admin badge, email, and profile circle

- [ ] **Reject invalid credentials**
  Enter wrong email or password
  **Expected:** Error message shown, remains on login page

- [ ] **Protected routes redirect unauthenticated users**
  Open `http://electricity.fahmiefendy.dev/` without being logged in
  **Expected:** Redirected to `/login`

- [ ] **Profile dropdown works**
  Click the profile circle avatar in the top-right corner
  **Expected:** Dropdown shows "Import Spreadsheet Data" and "Logout" options

- [ ] **Logout from dropdown**
  Click profile circle → Logout
  **Expected:** Session cleared, redirected to login

- [ ] **Click-outside closes dropdown**
  Open dropdown, then click anywhere else on the page
  **Expected:** Dropdown closes without navigating away

- [ ] **Session persists on refresh**
  After login, refresh the page
  **Expected:** User remains authenticated

---

## 4. Meter Readings

- [ ] **Dashboard displays readings**
  Navigate to dashboard after login
  **Expected:** Table of meter readings shown (or empty state if no data)

- [ ] **Readings table pagination works**
  If more than 15 readings exist, navigate to page 2 via the pagination controls
  **Expected:** Next page of readings loads correctly from the server; page indicator updates

- [ ] **Readings table page size selector works**
  Change the "Show X entries" dropdown to 25
  **Expected:** 25 rows loaded from the server; pagination recalculates

- [ ] **Month filter shows all months**
  Open the month filter dropdown in the Readings Table
  **Expected:** All months with data appear, not just months visible in the current page

- [ ] **Import loading spinner is visible**
  Open the Import modal, paste CSV data, and click Import
  **Expected:** Spinner is white and visible on the dark import button while loading
- [ ] **Create a new reading**
  Add a new meter reading with kWh value and optional notes
  **Expected:** Reading created; the *previous* latest reading now shows calculated fields correctly

- [ ] **"🕒 Now" button works on new reading form**
  Click the "Now" button next to the Date & Time field
  **Expected:** The datetime-local input updates to current local date and time

- [ ] **Calculations use prepaid formula**
  Create two readings with known values (e.g. prev=50.0, current=35.0, no token)
  **Expected:**
  - `kwhUsed` = `50.0 - 35.0` = **15.0**
  - `costRp` = `15.0 × tariff`

- [ ] **Token purchase included in calculation**
  Create a reading where `buyKwh` is set (e.g. prev=10.0, token=100.0, current=95.0)
  **Expected:**
  - `kwhUsed` = `(10.0 + 100.0) - 95.0` = **15.0**

- [ ] **Update a reading**
  Click ✏️, change a value, click Save
  **Expected:** Reading updates; the subsequent reading's derived fields are recalculated correctly (not negative)

- [ ] **"🕒 Now" button works on edit form**
  Click ✏️ on an existing reading, then click the "Now" button
  **Expected:** The datetime-local input updates to the current time

- [ ] **Delete a reading**
  Click 🗑️ → Confirm
  **Expected:** Reading removed; the reading after the deleted one recalculates correctly

---

## 5. Settings

- [ ] **View current tariff**
  Navigate to Master Data Settings at the bottom of the dashboard
  **Expected:** Current tariff shown in Rupiah/kWh

- [ ] **Update tariff**
  Change the electricity tariff value and save
  **Expected:** New tariff saved; new readings use the updated rate

---

## 6. Data Import

- [ ] **Import from profile dropdown**
  Click profile circle → Import Spreadsheet Data
  **Expected:** Import modal opens

- [ ] **Import valid CSV**
  Upload a CSV with columns: `Date, kWh, Time, Hour Difference, Buy kWh, kWh Used, Cost (Rp), Notes`
  **Expected:** Readings imported, appear in the dashboard table with correct positive values

- [ ] **Reject invalid format**
  Upload a non-CSV file or CSV with wrong columns
  **Expected:** Error message shown, no data imported

---

## 7. Monthly Report

- [ ] **Monthly report renders**
  View the Monthly Report section with multiple months of data
  **Expected:** Table shows columns: Month | Entries | Avg kWh/Day | Total kWh | Avg Cost/Day | Total Cost

- [ ] **Entries format shows progress**
  Check the Entries column for a complete month
  **Expected:** Displays as `28/28` (February) or `31/31` (March), not just a raw count

- [ ] **Partial month shows correct total days**
  Check the current month (in progress)
  **Expected:** Displays as e.g. `14/31` where 31 is the actual number of days in the month

---

## 8. Charts & Visualization

- [ ] **Charts render with data**
  View the dashboard with multiple readings
  **Expected:** Recharts graphs display kWh usage and cost trends over time

- [ ] **Charts handle empty state**
  View the dashboard with no readings
  **Expected:** Empty state or placeholder shown (no crash)

---

## 9. Error Handling

- [ ] **API returns proper error codes**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://electricity.fahmiefendy.dev/api/readings
  ```
  **Expected:** `401` (unauthenticated)

- [ ] **Invalid reading data returns validation error**
  Submit a reading with missing required fields
  **Expected:** `400` with error message

---

## 10. Rollback

- [ ] **Previous image can be restored**
  ```bash
  docker compose pull et-app
  docker compose up -d et-app
  docker logs et-app --tail 10
  ```
  **Expected:** Container starts with previous version, app loads correctly

- [ ] **Historical data recalculation works**
  If formula changes are deployed, run:
  ```bash
  npx tsx prisma/recalculate-all.ts
  ```
  **Expected:** Script completes without errors, all kWh values are positive
