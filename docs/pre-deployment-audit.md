# MandiSaathi — Production Pre-Deployment Audit Report

**Audit Target:** Public Cloud Deployment (GitHub + Render Static Site + Render Web Service + Managed PostgreSQL 16)  
**Audit Date:** November 9, 2026  
**Status:** **ACTION REQUIRED (DEPLOYMENT BLOCKED UNTIL 7 ITEMS RESOLVED)**  
**Auditor Persona:** Senior DevOps, Security & Cloud Infrastructure Auditor  

---

## 1. Executive Summary

This comprehensive pre-deployment audit examines the complete MandiSaathi codebase to evaluate its readiness for public cloud deployment. The deployment plan targets:
- **Source Control:** GitHub
- **Frontend Hosting:** Render Static Site (React 19 / Vite 6 / TypeScript)
- **Backend Hosting:** Render Web Service via Docker (Java 21 / Spring Boot 3.3.5)
- **Database:** Render Managed PostgreSQL 16

### Current Health & Test Verification Status
| Verification Target | Command Executed | Result | Status |
|---|---|---|---|
| **Backend Unit & Integration Tests** | `./mvnw clean test` | 39 tests executed, 0 failures, 0 errors, 0 skipped (Time: 9.48s) | **PASSED** |
| **Backend Production Jar Packaging** | `./mvnw clean package -DskipTests` | Produced `mandisaathi-backend-0.1.0-SNAPSHOT.jar` (Time: 3.96s) | **PASSED** |
| **Backend Docker Multi-Stage Image Build** | `docker build -t mandisaathi-backend:test ./backend` | 16/16 steps finished, non-root user image exported cleanly (Time: 139.0s) | **PASSED** |
| **Frontend TypeScript Typechecking** | `npx tsc --noEmit` | 0 type errors | **PASSED** |
| **Frontend Production Build** | `npm run build` | Built in 3.06s (`index-UNFOiH7V.js` 1,097 kB, `index-C6UNjN39.css` 39.9 kB) | **PASSED** |
| **System Health Probes** | `GET /api/v1/health`, `GET /actuator/health` | HTTP 200 `{"status":"UP"}` across DB & Gnani | **PASSED** |
| **Frontend Credential Leak Check** | `grep -rn "API_KEY\|vachana" frontend/dist/` | Zero leaked tokens, secrets, or internal hosts | **PASSED** |

### Verdict: Pre-Deployment Readiness Assessment
While the application logic, unit/integration test suite (39/39 passing), and frontend production builds are healthy, **the repository is NOT yet ready for immediate zero-touch push-button deployment**. Exactly **7 blockers** must be addressed to prevent build failures, CORS rejection, port mismatches, and SPA routing errors on Render.

---

## 2. Repository Structure

```
mandisaathi/
├── .env.example                               # Root environment template (tracked, no secrets)
├── .gitignore                                 # Git ignore patterns (ignores .env, keys, build artifacts)
├── docker-compose.yml                         # Local multi-container development orchestration
├── README.md                                  # Project overview and quickstart guide
│
├── backend/                                   # Spring Boot 3.3.5 / Java 21 REST API
│   ├── Dockerfile                             # Multi-stage production Docker build
│   ├── mvnw / mvnw.cmd                        # Maven wrapper scripts
│   ├── .mvn/wrapper/                          # Maven wrapper configuration
│   ├── pom.xml                                # Maven build specification (Java 21, Spring Boot 3.3.5)
│   └── src/
│       ├── main/
│       │   ├── java/com/mandisaathi/
│       │   │   ├── client/gnani/              # Gnani Prisma STT & Timbre TTS HTTP clients
│       │   │   ├── config/                    # Security, CORS, and Gnani property configurations
│       │   │   ├── controller/                # REST Controllers (Voice, Prices, Mandis, Schemes, etc.)
│       │   │   ├── dto/                       # Request/Response Data Transfer Objects
│       │   │   ├── entity/                    # JPA Entities (PriceRecord, Mandi, Commodity, etc.)
│       │   │   ├── repository/                # Spring Data JPA Repositories
│       │   │   └── service/                   # Domain Services (VoiceAssistantService, MandiDataIngestion, etc.)
│       │   └── resources/
│       │       ├── application.yml            # Primary application configuration
│       │       └── db/migration/              # Flyway schema migrations (V1 to V5)
│       └── test/                              # 39 JUnit 5 & Spring Boot integration tests
│
├── database/                                  # Local database assets
│   ├── init.sql                               # PostgreSQL container initialization (uuid-ossp extension)
│   └── migrations/                            # Schema migration duplicates (V1 to V4)
│
├── frontend/                                  # React 19 / Vite 6 / TypeScript PWA
│   ├── Dockerfile                             # Nginx multi-stage build (for local containerized use)
│   ├── nginx.conf                             # Nginx reverse proxy configuration for Docker
│   ├── package.json                           # Dependencies (React 19, Lucide, Recharts, TanStack Query)
│   ├── tsconfig.json                          # TypeScript strict compiler options
│   ├── vite.config.ts                         # Vite configuration (port 5173, dev proxy to /api)
│   ├── tailwind.config.js                     # Tailwind CSS tokens (agricultural palette, Indic typography)
│   ├── index.html                             # Single Page Application entrypoint (Noto Sans Indic fonts)
│   ├── public/                                # Static PWA assets (manifest.webmanifest, sw.js, icons)
│   └── src/
│       ├── App.tsx                            # React Router tree & QueryClient provider
│       ├── components/                        # UI Primitives & Layout (Header, Sidebar, MobileBottomNav, etc.)
│       ├── context/                           # LanguageContext (10 Indic dialects) & NetworkContext
│       ├── pages/                             # Core screens (Home, PriceIntelligence, MandiComparison, More)
│       ├── services/                          # apiClient.ts & offlineStorage.ts (IndexedDB)
│       ├── types/                             # TypeScript interfaces & domain types
│       └── utils/                             # 16kHz mono audio encoder for Gnani STT
│
├── docs/                                      # Architecture, runbooks, and design audits
└── scripts/                                   # Automation, verification, and Playwright test scripts
```

---

## 3. Prioritized Deployment Blockers

Before deploying to GitHub and Render, the following 7 issues must be resolved:

### Blocker 1: Untracked Production Migration (`V5__phase5_provenance_and_variety.sql`)
- **Severity:** High (Database Schema Inconsistency)
- **Root Cause:** `backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql` is currently untracked in Git (`git status`).
- **Consequence:** If pushed to GitHub without staging `V5`, production Flyway on Render Managed PostgreSQL will only migrate up to `V4`. The `variety` and `provenance_type` columns will be missing from production PostgreSQL, and `idx_price_records_provenance` will not be created.
- **Remediation:** Stage and commit `V5__phase5_provenance_and_variety.sql` before pushing to GitHub. Also sync `database/migrations/` to match.

### Blocker 2: Server Port Binding Mismatch on Render
- **Severity:** High (Service Boot Failure / Health Check Timeout)
- **Root Cause:** In `backend/src/main/resources/application.yml`, server port is declared as:
  ```yaml
  server:
    port: ${SERVER_PORT:8080}
  ```
- **Consequence:** Render Web Services inject the environment variable `PORT` (typically `10000`). Spring Boot will ignore `PORT` and bind to `8080`. Render will expect the container to listen on `$PORT` (10000) or will fail port detection, resulting in health check timeout failure.
- **Remediation:** Update `application.yml` to support Render's `PORT` variable:
  ```yaml
  server:
    port: ${PORT:${SERVER_PORT:8080}}
  ```
  Or explicitly set `SERVER_PORT=8080` (or `PORT=8080`) in Render's Web Service environment variables.

### Blocker 3: Frontend `VITE_API_BASE_URL` Build-Time Ingestion
- **Severity:** High (Runtime API Disconnection)
- **Root Cause:** In `frontend/src/services/apiClient.ts`:
  ```typescript
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  ```
- **Consequence:** On a Render **Static Site**, Vite compiles the frontend into static HTML/JS/CSS at build time. There is no Nginx reverse proxy forwarding `/api/` calls to `http://backend:8080`. If `VITE_API_BASE_URL` is omitted during the Render Static Site build step, API calls will default to `''` (relative path) and hit Render Static Site's CDN, returning HTTP 404 or rewriting to `index.html`.
- **Remediation:** In the Render Static Site dashboard, define:
  ```
  VITE_API_BASE_URL = https://<your-backend-service-slug>.onrender.com
  ```

### Blocker 4: Render Static Site SPA Routing (Missing Rewrite Rule)
- **Severity:** High (Direct Deep Links Return HTTP 404)
- **Root Cause:** MandiSaathi uses React Router (`BrowserRouter`) with paths like `/prices`, `/compare`, `/more`, `/assistant`.
- **Consequence:** Render Static Site natively serves static files. If a user navigates directly to `https://mandisaathi.onrender.com/prices` or refreshes the page, Render will search for a file named `/prices` and return a 404 Not Found error.
- **Remediation:** Add a Rewrite rule in Render Static Site settings:
  - **Type:** `Rewrite`
  - **Source:** `/*`
  - **Destination:** `/index.html`

### Blocker 5: Backend CORS Allowed Origins
- **Severity:** High (Browser Cross-Origin Request Blocked)
- **Root Cause:** In `backend/src/main/resources/application.yml`:
  ```yaml
  app:
    cors:
      allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000}
  ```
  And `CorsConfig.java` enforces `configuration.setAllowCredentials(true)`.
- **Consequence:** When the React frontend on `https://mandisaathi.onrender.com` makes an API call to `https://mandisaathi-backend.onrender.com`, the browser sends an `Origin: https://mandisaathi.onrender.com` header. If `CORS_ALLOWED_ORIGINS` is not set on the backend, Spring Boot will reject the request with HTTP 403 / CORS preflight error. Because credentials (`setAllowCredentials(true)`) are enabled, wildcard `*` is strictly illegal under W3C CORS specifications.
- **Remediation:** Set `CORS_ALLOWED_ORIGINS` in Render Web Service environment variables to include the exact frontend Render domain:
  ```
  CORS_ALLOWED_ORIGINS = https://mandisaathi.onrender.com
  ```

### Blocker 6: Render Managed PostgreSQL JDBC Connection Format
- **Severity:** Medium (Database Connection Failure)
- **Root Cause:** Render Managed PostgreSQL provides a standard PostgreSQL URI:
  ```
  DATABASE_URL = postgres://user:password@dpg-xxx-a:5432/mandisaathi
  ```
  Java JDBC `DriverManager` requires the `jdbc:postgresql://` scheme and does NOT recognize `postgres://`.
- **Consequence:** If the Render `DATABASE_URL` is passed directly as `spring.datasource.url`, Spring Boot will crash on boot with `java.sql.SQLException: No suitable driver found for postgres://...`.
- **Remediation:** In Render Web Service, supply individual parameters:
  - `DB_HOST` = `<render-db-internal-host>`
  - `DB_PORT` = `5432`
  - `DB_NAME` = `mandisaathi`
  - `DB_USER` = `mandisaathi`
  - `DB_PASSWORD` = `<password>`
  Or define `SPRING_DATASOURCE_URL = jdbc:postgresql://<render-db-internal-host>:5432/mandisaathi?sslmode=require`.

### Blocker 7: Git Remote & Uncommitted Files
- **Severity:** High (Incomplete Source on GitHub)
- **Root Cause:** `git remote -v` is empty. The local repository has uncommitted modifications across 27 files (localization dictionaries, UI redesign, and test scripts).
- **Remediation:** Create a GitHub repository, stage verified files, commit with descriptive message, and push branch `master` (or `main`).

---

## 4. Security & Credentials Audit

### A. Secrets Verification
- **`.env` Ignored:** Verified. Line 15 of `.gitignore` specifies `.env`, `.env.local`, `.env.*.local`.
- **Git Commit History Scan:**
  ```bash
  git log -p -S "GNANI_API_KEY=" | grep "GNANI_API_KEY="
  ```
  Output confirmed that no real API keys were ever committed to Git. Only placeholder templates (`your_gnani_api_key_here` or blank) were committed to `.env.example`.
- **Private Key Files:**
  ```bash
  git ls-files | grep -E "\.(key|pem|p12|jks)$"
  ```
  Returned 0 files. Zero certificates or private keys are tracked.

### B. Frontend Bundle Audit
- Production build outputs in `frontend/dist/` were inspected for secrets:
  - `GNANI_API_KEY`: **NOT FOUND** (0 occurrences).
  - `DATA_GOV_IN_API_KEY`: **NOT FOUND** (0 occurrences).
  - Database credentials (`DB_PASSWORD`): **NOT FOUND** (0 occurrences).
  - Internal backend hosts (`vachana.ai`): **NOT FOUND** (0 occurrences).
- The string `prisma` only appears as a static UI label: `"GNANI PRISMA STT"`.
- **Conclusion:** Private credentials remain strictly backend-only. The frontend bundle contains zero sensitive credentials.

### C. Render Configuration Policy
- **Rule:** Never commit credentials in `render.yaml`.
- All sensitive variables (`GNANI_API_KEY`, `DB_PASSWORD`, `DATA_GOV_IN_API_KEY`) must be configured as **Sync: false** in `render.yaml` or entered manually via the Render Web Service dashboard under **Environment**.

---

## 5. Data Integrity & Provenance Status

### Provenance Audit Findings
1. **Current Stored Data:**
   - Exactly **15 price records** exist in PostgreSQL (IDs 1 through 15).
   - **100% of these records are seeded baseline records** populated during Flyway migration `V2__phase2_schema.sql`.
   - No dynamic live ingestion from data.gov.in has taken place (`DATA_GOV_IN_API_KEY` is unconfigured locally, and `MANDI_DATA_ENABLED=false`).
2. **Preservation Mandate:**
   - In accordance with audit requirements, these 15 records **must remain designated as `SEEDED_BASELINE`**.
   - They must never be falsely labeled as live real-time Agmarknet telemetry.
   - When deployed to production PostgreSQL, Flyway migrations will populate this exact verified baseline, providing immediate utility to farmers without corrupting provenance.
3. **Failure Isolation:**
   - When `MandiDataIngestionService` runs without an API key or encounters an upstream failure, it gracefully logs an informational notice, records status `SKIPPED` in `ingestion_runs`, and **leaves all existing records untouched**. Zero records are overwritten, fabricated, or deleted.

---

## 6. Exact Render Deployment Configuration

### Service 1: Render Static Site (React Frontend)
| Configuration Field | Exact Value |
|---|---|
| **Service Type** | Static Site |
| **Name** | `mandisaathi-frontend` |
| **Branch** | `master` (or `main`) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **Auto-Deploy** | Yes |

#### Static Site Rewrites (SPA Routing)
| Action | Source Path | Destination Path |
|---|---|---|
| **Rewrite** | `/*` | `/index.html` |

#### Static Site Headers (PWA Cache Control)
| Path | Header Name | Header Value |
|---|---|---|
| `/sw.js` | `Cache-Control` | `no-cache, no-store, must-revalidate` |
| `/sw.js` | `Service-Worker-Allowed` | `/` |
| `/*` | `X-Frame-Options` | `DENY` |
| `/*` | `X-Content-Type-Options` | `nosniff` |

#### Static Site Environment Variables
| Variable Name | Value | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://mandisaathi-backend.onrender.com` | Base URL of the deployed Spring Boot backend. |

---

### Service 2: Render Web Service (Spring Boot Backend via Docker)
| Configuration Field | Exact Value |
|---|---|
| **Service Type** | Web Service |
| **Name** | `mandisaathi-backend` |
| **Environment** | Docker |
| **Branch** | `master` (or `main`) |
| **Root Directory** | `backend` |
| **Dockerfile Path** | `./Dockerfile` |
| **Docker Build Context** | `backend` |
| **Instance Type** | Starter (or Free) |
| **Health Check Path** | `/api/v1/health` |
| **Auto-Deploy** | Yes |

#### Web Service Environment Variables
| Variable Name | Type | Recommended Production Value | Description |
|---|---|---|---|
| `PORT` | Plain | `8080` | Internal container port for HTTP traffic. |
| `SERVER_PORT` | Plain | `8080` | Fallback port binding in Spring Boot. |
| `SPRING_PROFILES_ACTIVE` | Plain | `prod` | Activates production profile. |
| `CORS_ALLOWED_ORIGINS` | Plain | `https://mandisaathi-frontend.onrender.com` | Whitelisted frontend origin for browser API requests. |
| `DB_HOST` | Plain | `<render-postgres-internal-host>` | Internal hostname of Render PostgreSQL instance. |
| `DB_PORT` | Plain | `5432` | PostgreSQL default port. |
| `DB_NAME` | Plain | `mandisaathi` | Production database name. |
| `DB_USER` | Plain | `mandisaathi` | Production database username. |
| `DB_PASSWORD` | Secret | `<managed-db-password>` | Production database password (never commit). |
| `GNANI_ENABLED` | Plain | `true` | Enables Gnani AI speech processing. |
| `GNANI_API_KEY` | Secret | `<your-gnani-api-key>` | Gnani Prisma STT & Timbre TTS shared API key. |
| `GNANI_STT_URL` | Plain | `https://api.vachana.ai/stt/v3` | Upstream Gnani Prisma STT inference URL. |
| `GNANI_TTS_URL` | Plain | `https://api.vachana.ai/api/v1/tts/inference` | Upstream Gnani Timbre TTS inference URL. |
| `MANDI_DATA_ENABLED` | Plain | `false` | Set `true` once data.gov.in key is active. |
| `DATA_GOV_IN_API_KEY` | Secret | *(optional)* | Upstream Agmarknet API key if live sync enabled. |
| `JAVA_OPTS` | Plain | `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` | JVM container memory ceiling. |

---

### Service 3: Render Managed PostgreSQL
| Configuration Field | Exact Value |
|---|---|
| **Database Name** | `mandisaathi` |
| **User** | `mandisaathi` |
| **PostgreSQL Version** | `16` |
| **Access Control** | Internal (Accessible from Web Service within same Render region) |

---

### Infrastructure-as-Code Blueprint (`render.yaml`)

Below is the complete, secret-free Infrastructure-as-Code blueprint ready for Render Blueprint deployment:

```yaml
services:
  # 1. Spring Boot Backend Web Service (Docker)
  - type: web
    name: mandisaathi-backend
    runtime: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    dockerContext: backend
    plan: starter
    healthCheckPath: /api/v1/health
    envVars:
      - key: PORT
        value: "8080"
      - key: SERVER_PORT
        value: "8080"
      - key: SPRING_PROFILES_ACTIVE
        value: prod
      - key: CORS_ALLOWED_ORIGINS
        value: https://mandisaathi-frontend.onrender.com
      - key: DB_HOST
        fromDatabase:
          name: mandisaathi-db
          property: host
      - key: DB_PORT
        value: "5432"
      - key: DB_NAME
        fromDatabase:
          name: mandisaathi-db
          property: database
      - key: DB_USER
        fromDatabase:
          name: mandisaathi-db
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: mandisaathi-db
          property: password
      - key: GNANI_ENABLED
        value: "true"
      - key: GNANI_API_KEY
        sync: false
      - key: GNANI_STT_URL
        value: https://api.vachana.ai/stt/v3
      - key: GNANI_TTS_URL
        value: https://api.vachana.ai/api/v1/tts/inference
      - key: MANDI_DATA_ENABLED
        value: "false"
      - key: DATA_GOV_IN_API_KEY
        sync: false
      - key: JAVA_OPTS
        value: "-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

  # 2. React Frontend Static Site
  - type: static
    name: mandisaathi-frontend
    rootDir: frontend
    buildCommand: npm install && npm run build
    publishDir: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      - path: /sw.js
        name: Cache-Control
        value: no-cache, no-store, must-revalidate
      - path: /sw.js
        name: Service-Worker-Allowed
        value: /
    envVars:
      - key: VITE_API_BASE_URL
        value: https://mandisaathi-backend.onrender.com

# 3. Managed PostgreSQL Database
databases:
  - name: mandisaathi-db
    databaseName: mandisaathi
    user: mandisaathi
    plan: starter
    postgresMajorVersion: 16
```

---

## 7. Testing & Verification Runbook

### Commands for Pre-Deployment Verification

#### 1. Backend Compilation & Unit/Integration Tests
```bash
cd backend
./mvnw clean test
```
*Expected Result:* `BUILD SUCCESS`, 39 tests executed, 0 failures, 0 errors.

#### 2. Backend Production Jar Build
```bash
cd backend
./mvnw clean package -DskipTests
```
*Expected Result:* `mandisaathi-backend-0.1.0-SNAPSHOT.jar` generated in `target/`.

#### 3. Backend Docker Multi-Stage Image Build
```bash
docker build -t mandisaathi-backend:test ./backend
```
*Expected Result:* Clean multi-stage build completion (`eclipse-temurin:21-jre-alpine` runtime container).

#### 4. Frontend Typecheck & Production Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```
*Expected Result:* `built in ~3.1s`, `dist/index.html` and assets generated with zero type errors.

#### 5. Live Health Check Probes
```bash
# Public API Health
curl -s http://localhost:8080/api/v1/health | jq .

# Actuator Probe
curl -s http://localhost:8080/actuator/health | jq .
```
*Expected Result:* HTTP 200 with `status: "UP"`.

#### 6. Frontend Secret Audit Verification
```bash
# Confirm no private keys or internal endpoints exist in distribution JS
grep -rn -i "vachana\|GNANI_API_KEY" frontend/dist/
```
*Expected Result:* Zero matches.

---

## 8. Step-by-Step Pre-Deployment Action Plan

Before executing the public deployment, follow this sequence:

1. **Stage and Commit Untracked Assets:**
   - Commit `backend/src/main/resources/db/migration/V5__phase5_provenance_and_variety.sql`.
   - Commit `frontend/src/components/ui/AgriContourBackdrop.tsx`, `NumberTicker.tsx`, and `translations.ts`.
   - Update `database/migrations/` to match `backend/.../db/migration/`.
2. **Update Port Binding in `backend/src/main/resources/application.yml`:**
   - Change `port: ${SERVER_PORT:8080}` to `port: ${PORT:${SERVER_PORT:8080}}`.
3. **Configure Git Remote:**
   - Create a clean private or public repository on GitHub (`https://github.com/<user>/mandisaathi.git`).
   - Run:
     ```bash
     git remote add origin https://github.com/<user>/mandisaathi.git
     git branch -M main
     git push -u origin main
     ```
4. **Deploy on Render:**
   - Connect the GitHub repository to Render.
   - Use the Blueprint (`render.yaml`) or manually create the Managed PostgreSQL, Backend Web Service, and Frontend Static Site following the exact specifications in Section 6.
   - Input the secret `GNANI_API_KEY` into the Render Web Service Environment variables.
5. **Post-Deployment Smoke Verification:**
   - Verify `https://<backend>.onrender.com/api/v1/health` returns `UP`.
   - Verify `https://<frontend>.onrender.com` loads the home page.
   - Test client-side navigation (`/prices`, `/compare`, `/more`) and verify page refreshes do not 404.
   - Trigger a voice query or prompt chip click to confirm end-to-end STT $\rightarrow$ PostgreSQL $\rightarrow$ TTS audio loop.
