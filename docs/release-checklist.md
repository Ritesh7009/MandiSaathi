# MandiSaathi — Release Candidate Checklist (v1.0.0-RC1)

This checklist provides the formal verification and sign-off criteria for **MandiSaathi Release Candidate 1 (v1.0.0-RC1)** for the Gnani AI Great Indian AI Internship Challenge.

---

## 1. Codebase & Build Integrity

- [x] **Backend Build**: Clean compilation with OpenJDK 21 via Maven wrapper (`./mvnw clean compile`).
- [x] **Backend Unit & Integration Tests**: All 39 Spring Boot tests passing (`./mvnw test`).
- [x] **Frontend TypeScript Validation**: Strict type-checking with zero errors (`npx tsc --noEmit`).
- [x] **Frontend Production Bundle**: Vite production build succeeded without warnings (`npm run build`).
- [x] **Database Migrations**: Flyway migrations V1 through V4 apply cleanly without checksum mismatches.
- [x] **Dependency Audit**: Verified versions (Spring Boot 3.3.5, React 19.0.0, Vite 6.0.0, Tailwind CSS 3.4.17).

---

## 2. Gnani.ai AI Services Verification

- [x] **Unified Authentication**: Single `GNANI_API_KEY` authenticated via `X-API-Key-ID` header.
- [x] **Gnani Prisma STT**: Live upstream transcription verified for Hindi (`hi-IN`), Punjabi (`pa-IN`), and Indian English (`en-IN`).
- [x] **Gnani Timbre TTS**: Live upstream speech synthesis verified returning valid `audio/wav` binary (>500KB - 1MB payloads).
- [x] **Voice Selection**: Correct voice mapping verified (`Nalini` for Hindi and Punjabi, `Kaveri` for English).
- [x] **Client Playback**: Base64 audio decoding and browser HTML5 audio element playback functional.
- [x] **Graceful Fallback**: System gracefully falls back to local NLP and browser speech synthesis if upstream credentials fail or network drops.

---

## 3. Data Integrity & Agricultural Domain Rules

- [x] **Strict Grounding**: Zero price fabrication; every modal rate is directly linked to an official APMC record.
- [x] **No-Data Transparency**: Honest "No verified records for today" notice returned when unlisted commodities/mandis are requested.
- [x] **District Resolution**: Queries for district names (e.g., Ludhiana) prompt the farmer about the registered APMC yard (e.g., Khanna Mandi) without silent substitution.
- [x] **Mandi Comparison Guard**: Inter-market comparisons require at least two markets reporting on the exact same closed auction date.
- [x] **Scheduled Ingestion**: `@Scheduled` cron job configured for 19:00 IST (`0 0 19 * * *`, Asia/Kolkata) with audit logging in `ingestion_runs`.
- [x] **Concurrency & Rate Limiting**: Manual sync requests protected by `AtomicBoolean` lock and 10-second cooldown rate limit.

---

## 4. PWA & Offline Experience

- [x] **Web App Manifest**: Valid `manifest.webmanifest` and `manifest.json` configured with name, short name, icons, and theme color (`#1B4332`).
- [x] **PWA Icons**: High-resolution icons provided at 192x192px and 512x512px in both PNG and SVG formats.
- [x] **Service Worker**: Maintained Service Worker (`sw.js`) caching core app shell and static assets with `Cache-First` and `Network-First` strategies.
- [x] **Session Stability**: Service worker installation and updates never force an unexpected page reload during active farmer sessions.
- [x] **IndexedDB Price Cache**: Successfully retrieved price records cached in `mandisaathi_offline_db`.
- [x] **Timestamp Disambiguation**: UI clearly distinguishes between:
  - APMC Auction Closed Date (`priceDate`)
  - Client Browser Cached Time (`cachedAt`)
  - Backend Last Synchronized Time (`lastSyncedAt`)
- [x] **Stale Data Warning**: Amber warning banner displayed when cached data is older than 24 hours.
- [x] **Safe Caching Scope**: Only GET price queries are cached; POST requests, voice uploads, and grievance filings are strictly excluded from offline cache.
- [x] **Resilient Degradation**: Comprehensive exception handling ensures that if IndexedDB is disabled, full, or corrupt, the application gracefully continues without crashing.

---

## 5. Security & Secret Protection

- [x] **Zero Secret Leakage**: No API keys or database passwords committed to Git. `.gitignore` strictly protects `.env`.
- [x] **Server-Side API Guard**: All upstream API calls to Gnani and data.gov.in originate exclusively from Spring Boot backend.
- [x] **Frontend Sanitization**: Zero `VITE_` environment variables expose confidential keys to browser bundles.
- [x] **Input Sanitization**: User text queries and voice uploads validated against empty payloads and bounded length.
- [x] **CORS Configuration**: Restrictive CORS configuration in Spring Boot permitting requests only from authorized frontend origins.

---

## 6. Multi-Screen & Responsive Navigation

- [x] **Screen 1: Home Dashboard (`/`)**: Agricultural metrics, seasonal price telemetry, quick voice actions.
- [x] **Screen 2: Voice Assistant (`/assistant` or `/voice`)**: Multilingual voice interface, waveform visualizer, audio player.
- [x] **Screen 3: Price Intelligence (`/prices`)**: Filterable APMC price table, offline indicators, stale data notices.
- [x] **Screen 4: Mandi Comparison (`/compare`)**: Multi-mandi rate comparison, price spread metrics, Recharts bar charts.
- [x] **Screen 5: Government Schemes (`/schemes`)**: Comprehensive directory of PM-KISAN, PMFBY, and state subsidies with eligibility filters.
- [x] **Screen 6: Complaint Registration (`/complaints`)**: Grievance submission with structured tracking ID generation.
- [x] **Screen 7: Settings & Dialect (`/settings`)**: Audio voice speed, language preferences, network diagnostics, and cache management.
- [x] **Mobile Responsiveness**: Thumb-zone bottom navigation bar (`MobileBottomNav.tsx`) validated on 412x915 mobile viewports.

---

## 7. Automated Test Suite Verification

| Test Suite | Execution Command | Result |
| :--- | :--- | :---: |
| Spring Boot Backend Tests | `./mvnw test` | **39/39 PASS** |
| TypeScript Compiler | `npx tsc --noEmit` | **0 Errors** |
| Vite Production Build | `npm run build` | **PASS** |
| PWA & Offline Automation | `python3 scripts/test-pwa-offline.py` | **6/6 PASS** |
| Mobile Viewport Automation | `python3 scripts/test-mobile-browser.py` | **4/4 PASS** |
| End-to-End Farmer Journeys | `python3 scripts/test-farmer-journeys.py` | **5/5 PASS** |
| Gnani Upstream API Connectivity | `./scripts/verify-gnani.sh` | **2/2 PASS** |

---

## 8. Physical Device Status & Release Blockers

### Physical Device Status:
- [ ] **Physical Android Hardware Field Trial**: **Pending Manual Execution**.
  - While mobile viewports and network disconnects have been exhaustively tested via Playwright emulating a Google Pixel 7 under simulated 3G/offline throttling, physical on-device installation on an actual Android handset in rural field conditions has not yet been conducted.
  - Recommended physical validation steps are detailed in `docs/testing-guide.md`.

### Release Blockers:
- **Zero Critical Blockers**: All core features, AI voice pipelines, offline caching, and scheduled ingestion mechanisms are fully functional, verified, and hardened.
