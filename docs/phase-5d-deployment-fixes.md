# MandiSaathi — Phase 5D.1 Render Deployment Compatibility Fixes

**Document Version:** 1.0.0  
**Phase:** 5D.1 — Production Deployment Compatibility  
**Date:** November 9, 2026  
**Auditor & Implementation Engineer:** DevOps & Cloud Architecture Lead  
**Deployment Target:** GitHub + Render Static Site + Render Web Service (Docker) + Render Managed PostgreSQL 16  

---

## 1. Executive Summary

In accordance with the findings established in [`docs/pre-deployment-audit.md`](file:///home/ritesh/Desktop/mandisaathi/docs/pre-deployment-audit.md), surgical and minimal compatibility modifications have been implemented across the MandiSaathi repository to ensure full operational readiness for public deployment on Render.

**Key Achievements:**
- Configured dynamic port binding supporting Render's injected `$PORT` while preserving local default `8080`.
- Configured multi-variable PostgreSQL JDBC datasource resolution (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) with fallback compatibility for full URLs.
- Enhanced frontend actuator health probing in `NetworkContext.tsx` to honor `VITE_API_BASE_URL` during production execution.
- Fortified CORS configuration against dangerous wildcard credential combinations and included local IPv4 loopbacks.
- Authored a complete, secret-free Render Blueprint specification in [`render.yaml`](file:///home/ritesh/Desktop/mandisaathi/render.yaml) mapping the backend Docker service, frontend Static Site with SPA rewrites, and managed PostgreSQL 16 instance.
- Verified all 4 mandatory testing suites (Maven, TypeScript, Vite build, Docker multi-stage build) with **100% pass rate**.

---

## 2. Detailed Summary of Changes

### 2.1 Spring Boot Dynamic Port Binding
- **File Modified:** [`backend/src/main/resources/application.yml`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/application.yml)
- **Change:**
  ```yaml
  # Before
  server:
    port: ${SERVER_PORT:8080}

  # After
  server:
    port: ${PORT:${SERVER_PORT:8080}}
  ```
- **Rationale & Compatibility:** Render injects the assigned HTTP listener port via the `PORT` environment variable (e.g., `PORT=10000`). By evaluating `${PORT:${SERVER_PORT:8080}}`, Spring Boot dynamically listens on Render's injected port. When running locally via `./mvnw spring-boot:run` or in Docker Compose without `PORT` specified, it falls back seamlessly to `SERVER_PORT` or the default `8080`.

### 2.2 PostgreSQL Datasource Parameter Resolution
- **File Modified:** [`backend/src/main/resources/application.yml`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/application.yml)
- **Change:**
  ```yaml
  # Before
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mandisaathi}

  # After
  datasource:
    url: ${SPRING_DATASOURCE_URL:${JDBC_DATABASE_URL:jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mandisaathi}}}
  ```
- **Rationale & Security:** Constructing the JDBC URL from the 5 discrete variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) avoids the protocol mismatch caused by Render's raw `postgres://` connection strings (which the PostgreSQL JDBC driver rejects). Furthermore, SQL query logging remains suppressed (`show-sql: false`), preventing passwords or query tokens from appearing in production logs.

### 2.3 Frontend Health Probing & API Base URL Support
- **File Modified:** [`frontend/src/context/NetworkContext.tsx`](file:///home/ritesh/Desktop/mandisaathi/frontend/src/context/NetworkContext.tsx)
- **Change:**
  ```typescript
  // Before
  const res = await fetch('/actuator/health', { ... });

  // After
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const res = await fetch(`${apiBase}/actuator/health`, { ... });
  ```
- **Rationale:** All business API calls in the frontend already funnel through [`frontend/src/services/apiClient.ts`](file:///home/ritesh/Desktop/mandisaathi/frontend/src/services/apiClient.ts), which prepends `import.meta.env.VITE_API_BASE_URL`. `NetworkContext.tsx` previously used a relative path (`/actuator/health`), which on a separate Render Static Site CDN would query the static frontend host rather than the backend Web Service. Prepending `apiBase` ensures connectivity probes hit the actual Spring Boot service.

### 2.4 CORS Security & Allowed Origins
- **Files Modified:**  
  - [`backend/src/main/java/com/mandisaathi/config/CorsConfig.java`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/java/com/mandisaathi/config/CorsConfig.java)  
  - [`backend/src/main/resources/application.yml`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/application.yml)
- **Change:**
  ```java
  // In CorsConfig.java
  List<String> origins = Arrays.stream(allowedOrigins.split(","))
          .map(String::trim)
          .filter(s -> !s.isEmpty() && !s.equals("*"))
          .toList();
  if (origins.isEmpty()) {
      origins = List.of("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173");
  }
  configuration.setAllowedOrigins(origins);
  ```
- **Rationale:** Spring Boot strictly throws an exception or fails CORS evaluation when `allowCredentials(true)` is combined with wildcard origin `*`. The updated configuration strips any accidental wildcard entry, defaults cleanly to authorized local developer origins (`localhost` and `127.0.0.1`), and allows the production origin (`https://mandisaathi-frontend.onrender.com`) to be injected via `CORS_ALLOWED_ORIGINS`.

### 2.5 Standalone Migration File Synchronization
- **File Added:** [`database/migrations/V5__phase5_provenance_and_variety.sql`](file:///home/ritesh/Desktop/mandisaathi/database/migrations/V5__phase5_provenance_and_variety.sql)
- **Change:** Mirrored [`backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql) into the root `database/migrations/` directory to guarantee complete parity between local developer utilities and the backend Flyway classpath.

### 2.6 Render Infrastructure as Code Blueprint
- **File Created:** [`render.yaml`](file:///home/ritesh/Desktop/mandisaathi/render.yaml)
- **Specification:**
  - **Database:** Render Managed PostgreSQL 16 (`mandisaathi-postgres`).
  - **Backend Web Service:** Docker engine using [`backend/Dockerfile`](file:///home/ritesh/Desktop/mandisaathi/backend/Dockerfile), dynamic port binding, health probe at `/api/v1/health`, automated database credential wiring via `fromDatabase`, and zero hardcoded secrets (`GNANI_API_KEY` marked as `sync: false`).
  - **Frontend Static Site:** Node build (`npm install && npm run build`), static output at `dist/`, SPA deep-routing rewrite rule (`/* -> /index.html`), and `VITE_API_BASE_URL` pointing to the backend Web Service.

---

## 3. Test Suite Verification & Actual Execution Results

All required verification suites were executed locally in the exact deployment configurations:

| Test Target | Command Executed | Execution Time | Results & Output | Status |
|---|---|---|---|---|
| **Backend Tests** | `cd backend && ./mvnw clean test` | 11.47s | **39 tests run, 0 failures, 0 errors, 0 skipped.** Full JPA, Voice Pipeline, and Mandi Controller integration tests passed. | **PASSED** |
| **Frontend Typecheck** | `cd frontend && npx tsc --noEmit` | 2.10s | **0 errors.** TypeScript 5.7 compiler passed with zero diagnostics. | **PASSED** |
| **Frontend Production Build** | `cd frontend && npm run build` | 3.18s | **Production bundle generated:**<br>• `dist/index.html` (1.87 kB)<br>• `dist/assets/index-C6UNjN39.css` (39.90 kB)<br>• `dist/assets/index-B538wPcE.js` (1,097.37 kB) | **PASSED** |
| **Backend Docker Multi-Stage Build** | `docker build -t mandisaathi-backend:phase5d ./backend` | 13.80s | **16/16 steps finished successfully.** Eclipse Temurin 21 JRE Alpine image exported cleanly with non-root `appuser`. | **PASSED** |

---

## 4. Manual Configuration Steps Required in Render

While [`render.yaml`](file:///home/ritesh/Desktop/mandisaathi/render.yaml) automates the majority of the deployment topology, the following steps must be performed manually in the Render dashboard to complete the deployment securely:

### Step 1: Push Code to GitHub
1. Create a repository on GitHub (e.g. `https://github.com/<username>/mandisaathi`).
2. Add the remote and push the `master` (or `main`) branch:
   ```bash
   git remote add origin https://github.com/<username>/mandisaathi.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Connect Repository via Render Blueprints
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your `mandisaathi` GitHub repository.
4. Render will parse [`render.yaml`](file:///home/ritesh/Desktop/mandisaathi/render.yaml) and automatically detect:
   - PostgreSQL Database: `mandisaathi-postgres`
   - Web Service: `mandisaathi-backend`
   - Static Site: `mandisaathi-frontend`

### Step 3: Configure Secret Credentials in Render Dashboard
Because `render.yaml` strictly omits secret keys (`sync: false`), enter the following secret directly in the **Environment** settings of `mandisaathi-backend`:
- **Key:** `GNANI_API_KEY`
- **Value:** `<your-actual-gnani-vachana-api-key>`

*(Optional)* If enabling live data.gov.in polling:
- **Key:** `DATA_GOV_IN_API_KEY`
- **Value:** `<your-data-gov-in-api-key>`
- **Key:** `MANDI_DATA_ENABLED`
- **Value:** `true`

### Step 4: Verify Public URLs & Cross-Origin Sync
Once Render assigns the public URLs:
1. Confirm the backend URL (e.g., `https://mandisaathi-backend-xxxx.onrender.com`).
2. Confirm the frontend URL (e.g., `https://mandisaathi-frontend-xxxx.onrender.com`).
3. In `mandisaathi-backend` environment settings, verify `CORS_ALLOWED_ORIGINS` includes your actual frontend domain:
   `https://mandisaathi-frontend-xxxx.onrender.com,http://localhost:5173,http://localhost:3000`
4. In `mandisaathi-frontend` environment settings, verify `VITE_API_BASE_URL` matches your actual backend URL:
   `https://mandisaathi-backend-xxxx.onrender.com`
5. Trigger a **Manual Deploy $\rightarrow$ Clear build cache & deploy** on the frontend if `VITE_API_BASE_URL` was changed after initial build.

### Step 5: Post-Deployment Smoke Test
Verify the following endpoints in your browser or terminal:
- **Backend Public Health:**  
  `curl -s https://mandisaathi-backend-xxxx.onrender.com/api/v1/health | jq .`  
  *Expected Output:* `{"status":"UP","services":{"database":{"status":"UP"},"gnaniPrismaStt":{"status":"CONNECTED"},"gnaniTimbreTts":{"status":"CONNECTED"}}}`
- **Backend Actuator Health:**  
  `curl -s https://mandisaathi-backend-xxxx.onrender.com/actuator/health | jq .`  
  *Expected Output:* `{"status":"UP"}`
- **Frontend SPA Deep Linking:**  
  Navigate directly to `https://mandisaathi-frontend-xxxx.onrender.com/prices` and refresh to verify the rewrite rule serves the application without a 404 error.

---

## 5. Data Provenance & Farmer-Facing Invariants

- **Zero Mutation to Existing Prices:** All 15 baseline price records (`V2__phase2_schema.sql`) remain intact with `provenance_type = 'SEEDED_BASELINE'`.
- **Zero Ingestion Overwrites:** Dynamic API polling remains disabled by default (`MANDI_DATA_ENABLED=false`) until explicitly enabled by an operator with a valid API key.
- **Zero Leaked Credentials:** Neither `.env` nor Gnani/data.gov.in credentials exist in any tracked configuration or frontend bundle.

