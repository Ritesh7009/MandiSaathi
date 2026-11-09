# MandiSaathi — Phase 5D.2: Final Git and Render Deployment Readiness Audit

**Document Version:** 1.0.0  
**Phase:** 5D.2 — Pre-Push & Pre-Deployment Verification  
**Audit Date:** November 9, 2026  
**Auditor:** Senior Cloud Security & Infrastructure Auditor  
**Deployment Infrastructure:** GitHub (VCS) $\rightarrow$ Render Static Site (Frontend) + Render Web Service via Docker (Backend) + Render Managed PostgreSQL 16 (Database)  
**Overall Readiness Verdict:** **READY FOR GITHUB COMMIT & PUSH (1 STAGING ACTION REQUIRED)**  

> [!IMPORTANT]
> **Live Deployment Status Disclaimer:** In accordance with audit standards, no live deployment to Render has been initiated. All evaluations reflect local containerized builds, multi-stage Docker image verification, test suite outputs, and static blueprint analysis. Live Render execution must be verified during initial cloud provisioning.

---

## 1. Executive Status Matrix

| Audit Dimension | Target Verification Items | Result | Status |
|---|---|---|---|
| **1. Git & Secret Safety** | `.gitignore` coverage, tracked secret scans, commit history scans, `.env.example` placeholders | 0 real secrets detected; `.env` completely ignored; placeholders verified | **PASS** |
| **2. Flyway Migration Safety** | Version ordering (V1–V5), classpath isolation, no duplicate discovery, provenance preservation | V1–V5 sequential; 15 records safe as `SEEDED_BASELINE`; no duplicates | **PASS** |
| **3. Render Configuration** | `render.yaml` specification, PostgreSQL 16, Docker context, `fromDatabase` wiring, SPA rewrite | Blueprint matches Render v1 specification; discrete DB mapping valid | **PASS** |
| **4. Runtime Integration** | Health endpoints, `VITE_API_BASE_URL` propagation, `NetworkContext` probe, CORS wildcard defense | `/api/v1/health` UP; wildcard origins blocked; Gnani strictly backend-only | **PASS** |
| **5. Deployment Limitations** | Untracked assets, domain suffix collision risks, manual secret requirements, PWA HTTPS scope | 1 untracked Flyway file (`V5`) must be committed; manual dashboard inputs noted | **WARNING** |

---

## 2. In-Depth Audit Findings by Dimension

### 2.1 Git and Secret Safety Audit
- **Status:** **PASS**
- **Gitignore Verification:**
  - Evaluated using `git check-ignore -v .env backend/.env frontend/.env`.
  - All three paths match rule `.gitignore:16:.env`.
  - Command `git ls-files | grep "\.env"` returns only `.env.example`, `backend/.env.example`, and `frontend/.env.example`.
- **Secret Scanning across Tracked Files:**
  - Scanned 202 tracked files for RSA private keys, AWS tokens, API key assignments, and Bearer tokens.
  - Zero private credentials detected. The only match was a test mock string in [`backend/src/test/java/com/mandisaathi/GnaniClientTest.java:29`](file:///home/ritesh/Desktop/mandisaathi/backend/src/test/java/com/mandisaathi/GnaniClientTest.java#L29) (`TEST_SHARED_API_KEY = "gnani-shared-stt-tts-key-99999"`), which is used solely with `MockRestServiceServer`.
- **Secret Scanning across Git Commit History:**
  - Analyzed complete patch history (`git log -p --all`).
  - All variable occurrences of `GNANI_API_KEY` and `DATA_GOV_IN_API_KEY` in commit diffs are either empty placeholders in `.env.example`, Spring variable expressions (`${GNANI_API_KEY:}`), markdown documentation references, or the public government portal catalog URL (`https://api.data.gov.in/resource/...`).
  - Zero raw API keys, passwords, or tokens have ever been committed to the repository history.
- **Environment Template Audit:**
  - [`/.env.example`](file:///home/ritesh/Desktop/mandisaathi/.env.example), [`/backend/.env.example`](file:///home/ritesh/Desktop/mandisaathi/backend/.env.example), and [`/frontend/.env.example`](file:///home/ritesh/Desktop/mandisaathi/frontend/.env.example) were reviewed line-by-line. All sensitive variables (`GNANI_API_KEY=`, `DATA_GOV_IN_API_KEY=`) are blank strings, and database passwords default to `mandisaathi_secret` (local docker-compose dummy).

---

### 2.2 Flyway Migration Safety Audit
- **Status:** **PASS**
- **Classpath Discovery:**
  - Configured in [`backend/src/main/resources/application.yml`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/application.yml):
    ```yaml
    spring:
      flyway:
        enabled: true
        baseline-on-migrate: true
        locations: classpath:db/migration
    ```
  - `locations` points exclusively to `classpath:db/migration` ([`backend/src/main/resources/db/migration/`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/db/migration/)).
  - Standalone directory [`database/migrations/`](file:///home/ritesh/Desktop/mandisaathi/database/migrations/) is located outside Maven's build context and is **not** on the classpath. Therefore, `V5` is discoverable exactly once by Flyway.
- **Version Ordering & Integrity:**
  - `V1__initial_schema.sql` (Tables: commodities, mandis, price_records, government_schemes, complaints)
  - `V2__phase2_schema.sql` (15 Seed baseline records, schemes, indexes)
  - `V3__phase3_mandi_pipeline.sql` (Sync metadata, state/district indexing)
  - `V4__phase4b_sync_history.sql` (Sync logs, execution timestamps)
  - `V5__phase5_provenance_and_variety.sql` (Variety column, provenance_type column & index)
  - Versions 1 through 5 are strictly monotonic.
- **Parity with Root Mirror:**
  - Running `diff -u backend/src/main/resources/db/migration/ database/migrations/` confirms V3, V4, and V5 are byte-for-byte identical. V1 and V2 differ only by a single trailing newline character.
- **Data Integrity & Non-Destructive Invariant:**
  - [`V5__phase5_provenance_and_variety.sql`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql) performs:
    ```sql
    ALTER TABLE price_records ADD COLUMN IF NOT EXISTS variety VARCHAR(64) DEFAULT 'Standard / FAQ' NOT NULL;
    ALTER TABLE price_records ADD COLUMN IF NOT EXISTS provenance_type VARCHAR(32) DEFAULT 'SEEDED_BASELINE' NOT NULL;
    UPDATE price_records SET provenance_type = 'SEEDED_BASELINE' WHERE provenance_type IS NULL OR provenance_type = '';
    CREATE INDEX IF NOT EXISTS idx_price_records_provenance ON price_records (provenance_type);
    ```
  - Live query against PostgreSQL confirms:
    `SELECT count(*), provenance_type FROM price_records GROUP BY provenance_type;` $\rightarrow$ **15 records, 100% SEEDED_BASELINE**.
  - No records are deleted, truncated, or overwritten.

---

### 2.3 Render Configuration Audit
- **Status:** **PASS**
- **File Reference:** [`render.yaml`](file:///home/ritesh/Desktop/mandisaathi/render.yaml)
- **Database Specification:**
  - `name: mandisaathi-postgres`, `databaseName: mandisaathi`, `user: mandisaathi`, `postgresMajorVersion: 16`.
  - Successfully provisions a managed PostgreSQL 16 instance.
- **Backend Service Specification:**
  - `type: web`, `name: mandisaathi-backend`, `env: docker`.
  - `rootDir: backend`, `dockerfilePath: ./Dockerfile`, `dockerContext: .`.
  - Health check path configured to `/api/v1/health`.
  - Database credential injection via `fromDatabase` mapping discrete properties:
    `host`, `port`, `database`, `user`, `password` $\rightarrow$ correctly consumed by Spring Boot's constructed JDBC string.
  - Dynamic listener port wired via `PORT: 8080` (fallback) and handled by `server.port: ${PORT:${SERVER_PORT:8080}}`.
  - `GNANI_API_KEY` configured with `sync: false` to force safe manual dashboard entry.
- **Frontend Service Specification:**
  - `type: web`, `name: mandisaathi-frontend`, `env: static`.
  - `rootDir: frontend`, `buildCommand: npm install && npm run build`, `staticPublishPath: ./dist`.
  - Client-side deep-link route rewrite rule:
    ```yaml
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    ```
  - Compile-time API base URL: `VITE_API_BASE_URL: https://mandisaathi-backend.onrender.com`.

---

### 2.4 Runtime Integration Audit
- **Status:** **PASS**
- **Public & Management Health Probes:**
  - [`backend/src/main/java/com/mandisaathi/config/SecurityConfig.java`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/java/com/mandisaathi/config/SecurityConfig.java) permits all access to `/api/v1/health/**` and `/actuator/health/**`.
  - Live local test probe: `GET http://localhost:8080/api/v1/health` returns HTTP 200 with status `"UP"` across `database`, `gnaniPrismaStt`, and `gnaniTimbreTts`.
- **Frontend API Base URL Propagation:**
  - [`frontend/src/services/apiClient.ts`](file:///home/ritesh/Desktop/mandisaathi/frontend/src/services/apiClient.ts#L16) correctly reads `import.meta.env.VITE_API_BASE_URL || ''` for all 14 REST endpoints.
  - [`frontend/src/context/NetworkContext.tsx`](file:///home/ritesh/Desktop/mandisaathi/frontend/src/context/NetworkContext.tsx#L31) prepends `import.meta.env.VITE_API_BASE_URL || ''` to `/actuator/health` to avoid querying the static frontend CDN.
- **CORS Defense & Allowed Origins:**
  - [`backend/src/main/java/com/mandisaathi/config/CorsConfig.java`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/java/com/mandisaathi/config/CorsConfig.java) enables `setAllowCredentials(true)` and strictly filters out wildcard `*`:
    ```java
    List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty() && !s.equals("*"))
            .toList();
    ```
  - Eliminates the risk of browser CORS rejections due to unauthorized wildcard credentials.
  - Allows `https://mandisaathi-frontend.onrender.com` plus local loopbacks `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`.
- **Voice AI Architectural Isolation:**
  - Gnani endpoints (`https://api.vachana.ai/stt/v3`, `https://api.vachana.ai/api/v1/tts/inference`) and `X-API-Key-ID` authentication headers are encapsulated strictly within backend services ([`GnaniSttServiceImpl.java`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/java/com/mandisaathi/client/gnani/GnaniSttServiceImpl.java), [`GnaniTtsServiceImpl.java`](file:///home/ritesh/Desktop/mandisaathi/backend/src/main/java/com/mandisaathi/client/gnani/GnaniTtsServiceImpl.java)).
  - The frontend only exchanges raw audio blobs with `POST /api/v1/voice/query` or `POST /api/v1/voice/audio`. No third-party AI keys or endpoints are bundled into static JS assets.

---

### 2.5 Deployment Limitations & Operational Warnings
- **Status:** **WARNING (ACTION ITEMS IDENTIFIED)**
- **Warning 1: Untracked Migration File (`V5`)**  
  - *Symptom:* `git status` shows `backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql` is untracked (`??`).
  - *Impact:* If pushed without staging, Render will build from git and Flyway will only execute migrations up to `V4`. The columns `variety` and `provenance_type` will be missing in production PostgreSQL, causing runtime `PSQLException` on price queries.
  - *Remediation:* Stage and commit `V5` before pushing.
- **Warning 2: Render Subdomain Randomization**  
  - *Symptom:* If the slug `mandisaathi-backend` is already claimed on `onrender.com`, Render assigns a random suffix, e.g. `mandisaathi-backend-a1b2.onrender.com`.
  - *Impact:* Vite injects `VITE_API_BASE_URL` at **build time**. If the backend URL differs from `https://mandisaathi-backend.onrender.com`, the static frontend will attempt to connect to the wrong host.
  - *Remediation:* Note the exact assigned backend URL from the Render dashboard, update `VITE_API_BASE_URL` in the frontend static site settings, and trigger a cache-cleared rebuild.
- **Warning 3: Free Tier Cold Starts**  
  - *Symptom:* Render Free Web Services spin down after 15 minutes of inactivity.
  - *Impact:* The first request after sleep may take 30–50 seconds to boot the JVM container.
  - *Remediation:* The frontend `HealthBanner` and `VoiceAssistant` already implement retry handlers and graceful degraded UI messages (`Connecting to MandiSaathi servers...`).

---

## 3. Safe GitHub Push Checklist

Before executing `git push`, follow this exact sequence:

- [ ] **Step 1: Stage required Flyway migrations and deployment configurations**
  ```bash
  git add backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql
  git add database/migrations/V5__phase5_provenance_and_variety.sql
  git add render.yaml
  ```
- [ ] **Step 2: Stage UI redesign assets, translation dictionary and documentation**
  ```bash
  git add frontend/src/components/ui/AgriContourBackdrop.tsx
  git add frontend/src/components/ui/NumberTicker.tsx
  git add frontend/src/context/translations.ts
  git add frontend/src/utils/
  git add docs/
  git add scripts/verify_ui_ux_redesign.py
  ```
- [ ] **Step 3: Stage modified backend & frontend files**
  ```bash
  git add backend/
  git add frontend/
  ```
- [ ] **Step 4: Verify staged status (Ensure `.env` is NOT staged)**
  ```bash
  git status
  # Verify that .env, backend/.env, frontend/.env DO NOT appear in "Changes to be committed"
  ```
- [ ] **Step 5: Commit changes**
  ```bash
  git commit -m "feat(deploy): prepare repository for Render deployment with dynamic port, discrete DB wiring, and V5 provenance migration"
  ```
- [ ] **Step 6: Attach remote and push**
  ```bash
  git remote add origin https://github.com/<username>/<repo-name>.git
  git branch -M main
  git push -u origin main
  ```

---

## 4. Render Deployment Checklist

Follow this sequence in the Render Web Console:

- [ ] **Step 1: Log in & Create Blueprint**
  - Navigate to [dashboard.render.com](https://dashboard.render.com).
  - Click **New +** $\rightarrow$ **Blueprint**.
  - Connect your GitHub account and select your repository.
- [ ] **Step 2: Review Blueprint Plan**
  - Confirm Render detects:
    1. Database: `mandisaathi-postgres` (PostgreSQL 16)
    2. Web Service: `mandisaathi-backend` (Docker)
    3. Static Site: `mandisaathi-frontend` (Static)
  - Click **Apply**.
- [ ] **Step 3: Add Secret Credentials in Dashboard**
  - Open `mandisaathi-backend` $\rightarrow$ **Environment**.
  - Add secret environment variable:
    - **Key:** `GNANI_API_KEY`
    - **Value:** `<your-vachana-api-key>`
  - Click **Save Changes**.
- [ ] **Step 4: Verify Cross-Domain Alignment**
  - Check the generated URL for `mandisaathi-backend` (e.g. `https://mandisaathi-backend-xyz.onrender.com`).
  - Check the generated URL for `mandisaathi-frontend` (e.g. `https://mandisaathi-frontend-xyz.onrender.com`).
  - In `mandisaathi-backend` $\rightarrow$ **Environment**, confirm `CORS_ALLOWED_ORIGINS` includes `https://mandisaathi-frontend-xyz.onrender.com`.
  - In `mandisaathi-frontend` $\rightarrow$ **Environment**, confirm `VITE_API_BASE_URL` is set to `https://mandisaathi-backend-xyz.onrender.com`.
  - In `mandisaathi-frontend`, click **Manual Deploy** $\rightarrow$ **Clear build cache & deploy** to bake the URL into the static bundle.

---

## 5. Post-Deployment Smoke-Test Checklist

Once all services show **Live** in Render, verify end-to-end functionality:

- [ ] **1. Public API Health Probe**
  ```bash
  curl -s https://<backend-slug>.onrender.com/api/v1/health | jq .
  ```
  *Expected Output:*
  ```json
  {
    "status": "UP",
    "services": {
      "database": { "status": "UP" },
      "gnaniPrismaStt": { "status": "CONNECTED" },
      "gnaniTimbreTts": { "status": "CONNECTED" }
    }
  }
  ```
- [ ] **2. Actuator Health Probe**
  ```bash
  curl -s https://<backend-slug>.onrender.com/actuator/health | jq .
  ```
  *Expected Output:* `{"status": "UP"}`
- [ ] **3. Commodity Price Query**
  ```bash
  curl -s https://<backend-slug>.onrender.com/api/v1/prices | jq .
  ```
  *Expected Output:* JSON array of 15 records with `"provenance_type": "SEEDED_BASELINE"`.
- [ ] **4. Frontend Direct Deep-Link Routing (SPA Rewrite Test)**
  - Open `https://<frontend-slug>.onrender.com/prices` directly in a browser.
  - Refresh the page ($F5$ / $Ctrl+R$).
  - *Expected Result:* Page reloads into Price Intelligence view without HTTP 404.
- [ ] **5. Multilingual Voice Assistant End-to-End Test**
  - Open `https://<frontend-slug>.onrender.com/voice` in a browser with microphone access.
  - Select Punjabi or Hindi dialect.
  - Record voice query: *"What is the price of wheat in Khanna Mandi?"*
  - *Expected Result:* STT transcribes query, backend processes price, TTS audio wave visualizer animates, and audio response plays.
- [ ] **6. PWA Installation & Offline Verification**
  - Open DevTools $\rightarrow$ **Application** $\rightarrow$ **Service Workers**.
  - Verify `sw.js` is active and running.
  - Switch Network to **Offline** and refresh `https://<frontend-slug>.onrender.com/`.
  - *Expected Result:* App shell renders with cached prices and offline badge indicator.

