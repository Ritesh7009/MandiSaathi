# MandiSaathi — Demonstration Runbook & Operational Guide

This runbook provides complete operational procedures to start, verify, demonstrate, and troubleshoot MandiSaathi for technical evaluations, internship presentations, and release candidate validation.

---

## 1. System Requirements & Prerequisites

| Component | Required Version | Verification Command |
| :--- | :--- | :--- |
| **Java Development Kit (JDK)** | OpenJDK 21 LTS | `java -version` |
| **Node.js & npm** | Node.js 20+ / npm 10+ | `node -v && npm -v` |
| **Docker & Docker Compose** | Docker 24+ / Compose v2+ | `docker compose version` |
| **Python** | Python 3.10+ (for test suites) | `python3 --version` |
| **Operating System** | Linux (Ubuntu/Debian) or macOS | `uname -a` |

---

## 2. Environment Configuration (`.env`)

MandiSaathi requires a root-level `.env` file for local development and demonstration. 

```bash
# -------------------------------------------------------------
# MandiSaathi Local Environment Configuration
# Location: /home/ritesh/Desktop/mandisaathi/.env
# -------------------------------------------------------------

# PostgreSQL 16
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/mandisaathi
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Server Ports
SERVER_PORT=8080
VITE_PORT=5173

# Gnani.ai Unified Credentials (Prisma STT + Timbre TTS)
GNANI_ENABLED=true
GNANI_API_KEY=your_gnani_api_key_here
GNANI_STT_URL=https://asr.gnani.ai/listen
GNANI_TTS_URL=https://tts.gnani.ai/synthesize
GNANI_VOICE_HINDI=Nalini
GNANI_VOICE_PUNJABI=Nalini
GNANI_VOICE_ENGLISH=Kaveri

# Mandi Ingestion & Agmarknet
MANDI_INGESTION_ENABLED=true
MANDI_INGESTION_CRON=0 0 19 * * *
MANDI_INGESTION_TIMEZONE=Asia/Kolkata
MANDI_DATA_GOV_API_KEY=mock_key
MANDI_DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
```

> [!IMPORTANT]
> **API Key Guard**: `GNANI_API_KEY` is loaded exclusively into the Spring Boot backend process via environment variables. It is **never** bundled or exposed to Vite, client browsers, or git commits.

---

## 3. Step-by-Step System Startup

### Step 3.1: Start PostgreSQL Database Container
MandiSaathi uses PostgreSQL 16 mapped to host port `5433` (to avoid conflicting with any default system PostgreSQL on port 5432).

```bash
cd /home/ritesh/Desktop/mandisaathi
docker compose up -d postgres

# Verify container is healthy
docker compose ps
```

### Step 3.2: Launch Spring Boot 3.3.5 Backend
Spring Boot automatically applies Flyway migrations (`V1__initial_schema.sql` through `V4__phase4b_sync_history.sql`) and seeds baseline mandi rates upon startup.

```bash
cd /home/ritesh/Desktop/mandisaathi/backend

# Run with environment variables sourced
set -a && source ../.env && set +a
./mvnw spring-boot:run
```
*Wait for log:* `Started MandiSaathiApplication in X.XXX seconds (process running on port 8080)`.

### Step 3.3: Launch React 19 Frontend Dev Server
Vite runs the frontend application on port `5173`.

```bash
cd /home/ritesh/Desktop/mandisaathi/frontend
npm run dev -- --host
```
*Access point:* `http://localhost:5173/`

---

## 4. Pre-Flight Health & Verification Checks

Execute these checks before any presentation to confirm end-to-end readiness.

### Check 4.1: Backend Health Probes
```bash
# General application health
curl -s http://localhost:8080/actuator/health | jq .
# Expected: {"status":"UP"}

# MandiSaathi dedicated health probe
curl -s http://localhost:8080/api/v1/health | jq .
# Expected: {"status":"UP","database":"CONNECTED","version":"1.0.0-RC1"}
```

### Check 4.2: Upstream Gnani.ai API Verification
Verify both Prisma STT and Timbre TTS connectivity with a single test script:

```bash
cd /home/ritesh/Desktop/mandisaathi
./scripts/verify-gnani.sh
```
*Expected Output:*
- `[PASS] Gnani Prisma STT: HTTP 200 / transcript received`
- `[PASS] Gnani Timbre TTS: HTTP 200 / valid audio/wav received`

### Check 4.3: Mandi Seed Data Verification
Confirm that verified APMC mandi records are loaded in PostgreSQL:

```bash
curl -s http://localhost:8080/api/v1/prices | jq '.[0]'
```
*Expected:* Verified price record for Khanna Mandi (Wheat, ₹2320.00, date: `2026-11-07`).

### Check 4.4: Ingestion Sync Status
Check the status of scheduled and manual Agmarknet ingestion:

```bash
curl -s http://localhost:8080/api/v1/prices/sync/status | jq .
```
*Expected:* `{"isSyncRunning": false, "cronSchedule": "0 0 19 * * *", ...}`

---

## 5. Offline & PWA Demonstration Setup

One of MandiSaathi's core USPs is **zero-connectivity field access** for farmers in rural shadow zones.

### Procedure to Demonstrate Offline Mode:
1. Open Google Chrome or Chromium and navigate to `http://localhost:5173/prices`.
2. Observe the initial state:
   - Header badge displays green `● Online`.
   - Data header shows `● Live Agmarknet Feed`.
   - Prices table shows verified rates for Khanna, Sirsa, Karnal, etc.
   - Prices are automatically saved into client IndexedDB (`mandisaathi_offline_db`).
3. Open **Chrome DevTools** (`F12` or `Ctrl+Shift+I`) $\rightarrow$ Click **Network** tab $\rightarrow$ Change throttling dropdown from **No throttling** to **Offline**.
4. Observe immediate UI reactions:
   - Header badge transitions to amber `● Offline (ऑफ़लाइन)`.
   - Table banner switches to amber `● Offline Cached Mode (ऑफ़लाइन कैश मोड)`.
   - Timestamps clearly distinguish:
     - **Price Date**: `07 Nov 2026` (closed market auction date)
     - **Synced**: Exact timestamp when data was fetched from backend
   - If cached data is >24 hours old, an amber alert warns: *"Stale Data Notice: Market rates shown were cached over 24 hours ago."*
5. Navigate between tabs (`/prices`, `/compare`, `/schemes`) while offline to demonstrate Service Worker asset caching (`sw.js`).
6. In DevTools Network tab, switch back to **No throttling** (Online).
7. Notice the application automatically recovers within 1 second, refetching fresh rates and updating the badge back to `● Online`.

---

## 6. Fallback & Recovery Procedures

If unexpected issues arise during an evaluation, follow these recovery procedures:

### Scenario A: Upstream Gnani API Unreachable or Depleted Quota
- **Symptom**: Voice query returns fallback response; `aiServiceStatus: "OFFLINE_FALLBACK"`.
- **System Behavior**: MandiSaathi is designed to fail gracefully. The Spring Boot backend catches upstream timeouts/401s and automatically falls back to local regex NLP + Web Speech API browser TTS synthesis.
- **Recovery to Sandbox Mock**:
  ```bash
  # In backend/src/main/resources/application.yml or .env:
  GNANI_ENABLED=false
  ```
  Restart backend. The app runs in fully autonomous sandbox mode with synthetic audio and complete entity extraction.

### Scenario B: Database Connection Error (Port 5433)
- **Symptom**: `Connection refused: localhost:5433`
- **Remedy**:
  ```bash
  docker compose restart postgres
  # Wait 3 seconds
  docker compose ps
  ```

### Scenario C: Service Worker Corrupted or Stale Cache
- **Remedy**: In Chrome DevTools $\rightarrow$ **Application** tab $\rightarrow$ **Storage** $\rightarrow$ Click **Clear site data**. Refresh page (`Ctrl+F5`).

---

## 7. Automated Test Suite Execution

Before submission or final sign-off, run all automated validation suites:

```bash
# 1. Backend Spring Boot Unit & Integration Tests (39 tests)
cd /home/ritesh/Desktop/mandisaathi/backend
./mvnw test

# 2. Frontend TypeScript Build & Verification
cd /home/ritesh/Desktop/mandisaathi/frontend
npx tsc --noEmit && npm run build

# 3. PWA & Service Worker Offline Suite
cd /home/ritesh/Desktop/mandisaathi
python3 scripts/test-pwa-offline.py

# 4. Mobile Responsive & Dialect Suite (Pixel 7 Emulation)
python3 scripts/test-mobile-browser.py

# 5. Core Farmer Journeys Suite (5 End-to-End Journeys)
python3 scripts/test-farmer-journeys.py
```

---

## 8. Summary of Ports & Logs

| Service | Port | Endpoint / URL | Log Location |
| :--- | :---: | :--- | :--- |
| **Vite Frontend** | `5173` | `http://localhost:5173/` | Console / Terminal stdout |
| **Spring Boot Backend** | `8080` | `http://localhost:8080/` | Terminal stdout / Spring logs |
| **PostgreSQL 16** | `5433` | `localhost:5433/mandisaathi` | `docker logs mandisaathi-postgres` |
| **Actuator Health** | `8080` | `http://localhost:8080/actuator/health` | HTTP JSON |
| **API Health Probes** | `8080` | `http://localhost:8080/api/v1/health` | HTTP JSON |
