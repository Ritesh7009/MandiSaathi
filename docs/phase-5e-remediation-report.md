# MandiSaathi Phase 5E — Production Security, Data Integrity, and Reliability Remediation Report

**Date**: November 9, 2026  
**Repository**: `/home/ritesh/Desktop/mandisaathi`  
**Git Remote**: `https://github.com/Ritesh7009/MandiSaathi.git` (`main` branch)  
**Deliverable**: `docs/phase-5e-remediation-report.md`  

---

## 1. Executive Summary

Phase 5E systematically resolved critical architectural, security, and data provenance issues identified prior to public release. The remediation was conducted with non-negotiable boundaries:
- The React 19 UI, design tokens, and navigation flows were fully preserved.
- The 10 Gnani-supported Indian languages and voice assistant integrations remained intact.
- Seeded baseline price records were strictly preserved and never mutated.
- Zero premature Git commits or pushes were executed.

All 58 backend tests, TypeScript validation checks, Vite production builds, and Docker container builds passed with 100% success.

---

## 2. Systematic Remediation by Phase

### Phase A — Complaint API Security & Enumeration Prevention
- **Administrative Authorization**: Restricted `GET /api/v1/complaints` to administrative consumers requiring an `X-Admin-Key` header matching `app.security.admin-api-key` (configured via `${ADMIN_API_KEY}`). Unauthorized requests receive HTTP 403 Forbidden.
- **Unguessable Tracking Mechanism**: Created a cryptographically secure 128-bit hexadecimal `tracking_token` generated upon registration. Public tracking via `GET /api/v1/complaints/{ref}?token={token}` requires both the reference number and exact token, eliminating sequential enumeration.
- **Personal Data Protection**: Masked telephone numbers in all public responses (`******5678`), exposing raw phone numbers only to authenticated administrative requests.
- **Abuse Prevention**: Implemented in-memory sliding-window rate limiting on `POST /api/v1/complaints` restricting submissions to 20 per minute per IP address. Exceeded requests receive HTTP 429 Too Many Requests.
- **Client Private Tracking**: Updated frontend `ComplaintRegistration.tsx` to automatically store submitted complaint reference numbers and tracking tokens in browser `localStorage`, allowing farmers to monitor status privately on their device without public search.
- **Automated Security Suite**: Authored `ComplaintSecurityTest.java` (7 test scenarios) proving 403 without admin key, 200 with admin key, 403 on tracking without token, 200 on tracking with valid token, phone masking, and submission rate limiting.

### Phase B — Provenance and Database Integrity
- **Entity & DTO Mappings**: Mapped `variety` and `provenance_type` in `PriceRecord.java`, `PriceRecordDto.java`, and frontend `types/index.ts`.
- **Flyway Migration V6**: Authored `V6__phase5e_variety_constraint_and_complaint_security.sql` (mirrored in `backend/src/main/resources/db/migration` and `database/migrations`):
  - Dropped old constraint `uk_price_commodity_mandi_date` (which prevented multiple varieties on the same day).
  - Added composite uniqueness `uk_price_commodity_mandi_date_variety` on `(commodity_code, mandi_code, price_date, variety)`.
  - Added `tracking_token VARCHAR(64) NOT NULL` to the `complaints` table.
- **Baseline Preservation**: Verified that 15 seeded price records retain `SEEDED_BASELINE` provenance. Live ingestion records are strictly labeled `LIVE_INGESTED` and never overwrite seeded baselines.
- **Hibernate Schema Validation**: Started Spring Boot against local PostgreSQL 16 container (`mandisaathi-postgres` on port 5433) with `spring.jpa.hibernate.ddl-auto=validate`. Schema validation passed without errors in 7.6 seconds.

### Phase C — Ingestion Validation & Data Purity
- **Date Authenticity**: Missing, empty, or unparseable arrival dates are rejected immediately (`skipped++`). Defaulting to `LocalDate.now()` was eliminated.
- **Price Relationship Integrity**: Strictly verifies $\text{min\_price} \le \text{modal\_price} \le \text{max\_price}$ and $\text{price} > 0$. Records with negative, zero, or inverted prices are rejected—never mutated, swapped, or clamped.
- **24 State Normalization**: Implemented lookup mapping 24 Indian states and Union Territories to canonical 2-letter codes.
- **Composite Market Matching**: Normalized mandi lookup against market name, district, and state together. Records with missing district or state are rejected.
- **Telemetry Sanitization**: Ingestion run error summaries are sanitized to remove API keys and raw stack traces before saving to `mandi_ingestion_runs`.

### Phase D — Mandi Same-Date Comparison Integrity
- **Common Reporting Date Resolution**: In `PriceRecordService.comparePrices()`, evaluated records across all requested mandis to identify the latest common auction date where every requested mandi reported.
- **Divergence Handling**: When mandis report on different dates (or one mandi has no record for that date), the service returns an empty record set and an informative, localized explanation (`insufficientData: true`), preventing misleading price spread calculations across different dates.
- **Frontend Presentation**: Updated `MandiComparison.tsx` to display an amber alert card explaining that the selected mandis have not reported on a common date, guiding farmers to compare reporting dates.
- **Test Suite**: Authored `SameDateMandiComparisonTest.java` (3 test scenarios) verifying common-date resolution, divergence rejection, and empty record sets.

### Phase E — Privacy, Telemetry & Offline Caching
- **Service Worker v2 Allowlist**: Upgraded `sw.js` cache name from `v1` to `v2` with automatic legacy cache eviction. Restricted runtime caching to public agricultural data (`/api/v1/commodities`, `/mandis`, `/prices`, `/schemes`).
- **Sensitive Data Cache Bypass**: Explicitly bypassed `/api/v1/complaints`, `/api/v1/voice/audio`, and `/actuator/health` from service worker caches.
- **Speech Transcript Privacy**: Removed user voice transcripts from production logs across `VoiceAssistantService.java`, `VoiceAssistantController.java`, and `GnaniSttServiceImpl.java`. Logs retain only request duration, character count, and model confidence scores.

### Phase F — Voice & Concurrency Reliability
- **Bounded Concurrency Semaphore**: Replaced the global `AtomicBoolean` lock with a configurable `Semaphore` (default 5 permits) with a 3,000ms acquire timeout. When capacity is saturated, subsequent requests fail gracefully with HTTP 429 (`RATE_LIMIT_OVERLOAD`) rather than queueing indefinitely.
- **Upstream 429 Retry-After Handling**: Configured automatic 1-retry backoff in `GnaniSttServiceImpl` that parses upstream `Retry-After` HTTP headers and pauses before retrying.
- **Concurrency Test Suite**: Authored `VoiceConcurrencyTest.java` (3 test scenarios) proving permit saturation rejection (429), permit release upon completion, and upstream 429 retry backoff.

### Phase G — Docker & Render Deployment Readiness
- **Frontend Health Probe**: Updated `NetworkContext.tsx` to verify `res.ok`, `res.headers.get('content-type')?.includes('application/json')`, and `data.status === 'UP'`. This prevents SPA HTML fallback rewrites from falsely reporting backend health.
- **Nginx Proxy Configuration**: Added `/actuator/` upstream proxy block to `frontend/nginx.conf`.
- **Docker Compose Configuration**: Sourced `VITE_API_BASE_URL: ${VITE_API_BASE_URL:-}` in `docker-compose.yml`.
- **Render Configuration**: Added `ADMIN_API_KEY` (`sync: false`) to `render.yaml`. Verified that no secrets are committed to configuration files.

### Phase H — Documentation Integrity
- **README Overhaul**: Corrected broken Mermaid diagram syntax, updated clone URL to `https://github.com/Ritesh7009/MandiSaathi.git`, documented Flyway V1 through V6 migrations, detailed 10 Indic languages, documented grievance privacy, and updated test suite instructions.
- **Configuration Templates**: Documented `ADMIN_API_KEY` placeholders in `.env.example` and `backend/.env.example`.

---

## 3. Inventory of Changes

### Modified Files (27 files)
| File | Remediation Purpose |
| :--- | :--- |
| `.env.example` | Added `ADMIN_API_KEY` placeholder |
| `backend/.env.example` | Added `ADMIN_API_KEY` placeholder |
| `README.md` | Complete architectural update (V1–V6, same-date comparison, 10 languages, security) |
| `render.yaml` | Added `ADMIN_API_KEY` secret variable with `sync: false` |
| `docker-compose.yml` | Added fallback for `VITE_API_BASE_URL` |
| `backend/src/main/resources/application.yml` | Added `app.security.admin-api-key`, `max-concurrent-requests`, `acquire-timeout-ms` |
| `backend/src/main/java/com/mandisaathi/client/gnani/GnaniSttServiceImpl.java` | Semaphore concurrency, `Retry-After` backoff, transcript scrub |
| `backend/src/main/java/com/mandisaathi/config/GnaniProperties.java` | Added concurrency config fields, canonical constructor |
| `backend/src/main/java/com/mandisaathi/controller/ComplaintController.java` | Admin key check on list, unguessable token on track, rate limiting |
| `backend/src/main/java/com/mandisaathi/controller/VoiceAssistantController.java` | Removed speech transcripts from log output |
| `backend/src/main/java/com/mandisaathi/dto/ComplaintDto.java` | Added `trackingToken` field |
| `backend/src/main/java/com/mandisaathi/dto/PriceRecordDto.java` | Added `variety` and `provenanceType` fields |
| `backend/src/main/java/com/mandisaathi/entity/Complaint.java` | Added `@Column(name = "tracking_token")` |
| `backend/src/main/java/com/mandisaathi/entity/PriceRecord.java` | Added `@Column(name = "variety")` and `@Column(name = "provenance_type")` |
| `backend/src/main/java/com/mandisaathi/exception/GlobalExceptionHandler.java` | Handled `AccessDeniedException` -> HTTP 403 Forbidden |
| `backend/src/main/java/com/mandisaathi/repository/ComplaintRepository.java` | Added `findByReferenceNumberAndTrackingToken` |
| `backend/src/main/java/com/mandisaathi/repository/PriceRecordRepository.java` | Added `findByCommodityCodeAndMandiCodeAndPriceDateAndVariety` |
| `backend/src/main/java/com/mandisaathi/service/ComplaintService.java` | Secure token generation, phone masking, admin authorization |
| `backend/src/main/java/com/mandisaathi/service/MandiDataIngestionService.java` | Date rejection, price relationship validation, state mapping, trace sanitization |
| `backend/src/main/java/com/mandisaathi/service/PriceRecordService.java` | Same-date comparison logic, insufficient data multilingual messages |
| `backend/src/main/java/com/mandisaathi/service/VoiceAssistantService.java` | Removed speech transcripts from log output |
| `backend/src/test/java/com/mandisaathi/GnaniClientTest.java` | Updated `GnaniProperties` constructor invocation |
| `backend/src/test/java/com/mandisaathi/PriceRecordControllerTest.java` | Updated comparison test to test common-date resolution |
| `frontend/nginx.conf` | Added `/actuator/` proxy block |
| `frontend/public/sw.js` | Service Worker v2 allowlist, zero grievance caching |
| `frontend/src/context/NetworkContext.tsx` | Content-Type JSON check and `{status: "UP"}` validation |
| `frontend/src/pages/ComplaintRegistration.tsx` | Local device storage for grievances, token display, private tracking |
| `frontend/src/pages/MandiComparison.tsx` | Explanatory message rendering for diverging dates |
| `frontend/src/services/apiClient.ts` | Updated grievance API methods with `trackingToken` |
| `frontend/src/types/index.ts` | Added `variety`, `provenanceType`, `trackingToken` |

### New Files Created (6 files)
| File | Purpose |
| :--- | :--- |
| `backend/src/main/resources/db/migration/V6__phase5e_variety_constraint_and_complaint_security.sql` | Flyway V6 migration script |
| `database/migrations/V6__phase5e_variety_constraint_and_complaint_security.sql` | Mirrored Flyway V6 migration script |
| `backend/src/test/java/com/mandisaathi/ComplaintSecurityTest.java` | 7 test cases for grievance security, tokens, masking, rate limits |
| `backend/src/test/java/com/mandisaathi/ProvenanceAndIngestionValidationTest.java` | 6 test cases for provenance, date rejection, price validation |
| `backend/src/test/java/com/mandisaathi/SameDateMandiComparisonTest.java` | 3 test cases for common-date comparison resolution |
| `backend/src/test/java/com/mandisaathi/VoiceConcurrencyTest.java` | 3 test cases for semaphore limits, permit release, retry-after |

---

## 4. Verification & Test Execution Results

### 1. Maven Backend Test Suite
```bash
cd backend && ./mvnw test
```
- **Results**: `Tests run: 58, Failures: 0, Errors: 0, Skipped: 0`
- **Total Time**: 13.768 seconds
- **Status**: `BUILD SUCCESS`

### 2. Frontend TypeScript Static Check
```bash
cd frontend && npx tsc --noEmit
```
- **Results**: 0 errors
- **Exit Code**: 0

### 3. Frontend Production Build
```bash
cd frontend && npm run build
```
- **Results**:
  - `dist/index.html` (1.87 kB)
  - `dist/assets/index-C4f-BiJg.css` (40.10 kB)
  - `dist/assets/index-Cecn1xcp.js` (1,102.60 kB)
- **Build Time**: 5.20 seconds
- **Exit Code**: 0

### 4. Multi-Stage Docker Build
```bash
docker build -t mandisaathi-backend:phase5e ./backend
```
- **Results**: 16/16 steps finished
- **Image ID**: `mandisaathi-backend:phase5e`
- **Exit Code**: 0

### 5. Hibernate Schema Validation against PostgreSQL 16
```bash
SPRING_JPA_HIBERNATE_DDL_AUTO=validate ./mvnw spring-boot:run
```
- **Results**: Started `MandiSaathiApplication` in 7.662 seconds. All entity mappings (`PriceRecord`, `Complaint`, `Mandi`, `Commodity`, `GovernmentScheme`, `MandiIngestionRun`) validated successfully against the live PostgreSQL database with Flyway V1 through V6.

### 6. Live API Smoke Tests
- `GET /api/v1/health` $\rightarrow$ HTTP 200 `{"status": "UP", "database": "CONNECTED", "mandiDataSource": "STUBBED"}`
- `GET /actuator/health` $\rightarrow$ HTTP 200 `{"status": "UP"}`
- `GET /api/v1/complaints` (without key) $\rightarrow$ HTTP 403 Forbidden
- `GET /api/v1/complaints` (with `X-Admin-Key`) $\rightarrow$ HTTP 200 OK

---

## 5. Deployment Notes & Operational Recommendations

1. **Render Free Tier Spin-Down**:
   - The backend on Render free tier spins down after 15 minutes of inactivity. Cold starts take approximately 45–60 seconds.
   - Frontend `NetworkContext` accurately reflects connection state and does not report false positives while the backend wakes up.
2. **Environment Secrets on Render**:
   - When deploying to Render, manually set `GNANI_API_KEY` and `ADMIN_API_KEY` in the Render dashboard under the `mandisaathi-backend` service.
   - Both are designated `sync: false` in `render.yaml` to prevent accidental credential exposure.
3. **PWA Service Worker Updates**:
   - The upgraded `sw.js` cache name `v2` will automatically unregister and evict `v1` caches on user devices upon next page load over HTTPS.

---

*Report prepared and verified on Linux (x86_64) with Java 21.0.12.1, Node.js 20+, and PostgreSQL 16.*

