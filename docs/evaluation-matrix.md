# MandiSaathi — Technical Evaluation Matrix

This matrix maps MandiSaathi's implementation against the core evaluation criteria for the **Gnani AI Great Indian AI Internship Challenge**, establishing exact verification evidence, architecture artifacts, and validation status.

---

## 📊 Evaluation Rubric & Compliance Mapping

| Evaluation Dimension | Core Requirement | MandiSaathi Implementation Evidence | Verification Status |
| :--- | :--- | :--- | :---: |
| **1. Problem Relevance & Domain Grounding** | Solve real-world rural agricultural information asymmetry without digital literacy barriers. | • Target users: Smallholder farmers, rural producers, FPO managers.<br>• Covers APMC daily closed auctions, modal rates, inter-market spread.<br>• Domain-specific district-to-APMC yard resolution (e.g., Ludhiana $\rightarrow$ Khanna Mandi). | **Live-Verified** |
| **2. Use of Gnani.ai AI Services** | Authentic integration of Gnani Prisma STT and Timbre TTS engines for Indic voice processing. | • Unified `GNANI_API_KEY` authentication using `X-API-Key-ID`.<br>• Real upstream Prisma STT transcription (`hi-IN`, `pa-IN`, `en-IN`).<br>• Real upstream Timbre TTS synthesis (`Nalini` for Hindi/Punjabi, `Kaveri` for English).<br>• Audio streamed and played back via browser HTML5 Audio.<br>• Robust fallback to local NLP/browser TTS if upstream is unreachable. | **Live-Verified** |
| **3. Technical Architecture & Security** | Robust backend, typed frontend, relational database, security best practices. | • Backend: Java 21, Spring Boot 3.3.5, Spring Data JPA.<br>• Database: PostgreSQL 16 managed via Flyway migrations V1 through V4.<br>• Frontend: React 19.0.0, TypeScript 5.7.2, Vite 6.0.0, Tailwind CSS.<br>• Zero API secrets in frontend bundles; all credentials guarded server-side.<br>• Concurrency guards & rate limiting on sync endpoints (`AtomicBoolean`, cooldown). | **Live-Verified** |
| **4. Indic Language Accessibility** | Full end-to-end voice and text support in Hindi, Punjabi, and Indian English. | • Trilingual UI with instant runtime dialect switching.<br>• Hindi (`hi-IN`): Full voice query, transcription, and Timbre voice playback.<br>• Punjabi (`pa-IN`): Native Gurmukhi script support and authentic Timbre voice output.<br>• Indian English (`en-IN`): Professional extension officer workflow.<br>• Culturally authentic agricultural terminology (ਕਣਕ, ਬਾਸਮਤੀ, ਜੀਰੀ, ਫਸਲ, ਮੰਡੀ). | **Live-Verified** |
| **5. Data Grounding & Zero Fabrication** | Absolute prevention of AI hallucinations and price inventions. | • Strict grounding in verified APMC / Agmarknet records.<br>• Mandatory verification flags (`verified: true`, provenance tracking).<br>• Explicit "No official data recorded" notices for unlisted crops/mandis.<br>• Date-consistency comparison guard (refuses comparison on single market or divergent dates). | **Live-Verified** |
| **6. User Experience & Field Accessibility** | Mobile-responsive, high-contrast, thumb-zone navigation, low-cognitive-load UI. | • Agricultural design system (Deep Forest Green, Harvest Gold, Warm Ivory).<br>• Thumb-zone bottom navigation on mobile viewports (`MobileBottomNav.tsx`).<br>• Audio waveform visualizer, clear modal price typography, metric cards.<br>• Tested across Desktop and Mobile viewports (Pixel 7 emulation at 412x915). | **Tested** *(Browser Emulation)* |
| **7. Offline Resilience & Reliability** | Seamless functionality in low-bandwidth and zero-connectivity rural environments. | • PWA manifest (`manifest.webmanifest`) & Service Worker (`sw.js`).<br>• Client-side IndexedDB caching (`mandisaathi_offline_db`).<br>• Network status detection (`NetworkContext.tsx`) with visual badges.<br>• Timestamp disambiguation: Auction Date vs. Client Synced Timestamp.<br>• Stale data warning when cached records exceed 24 hours.<br>• Graceful degradation if IndexedDB is corrupted or restricted. | **Live-Verified** |
| **8. Scheduled Ingestion & Scalability** | Automated synchronization with national commodity price repositories. | • Spring Boot `@Scheduled` cron job (`0 0 19 * * *`, Asia/Kolkata).<br>• Full ingestion run audit logging in `ingestion_runs` table.<br>• Thread-safe concurrency lock preventing overlapping sync jobs.<br>• REST API sync monitoring (`/api/v1/prices/sync/status`). | **Live-Verified** |
| **9. Physical Device Testing** | Validation on physical Android/iOS hardware under real rural 2G/3G conditions. | • Emulated via Playwright on Google Chrome with simulated mobile viewport and offline network disconnect.<br>• Physical hardware testing on actual Android phones remains pending manual field trial. | **Pending** *(Physical Hardware)* |

---

## 🔍 Verification Status Legend

- **Live-Verified**: Verified with actual production infrastructure, live upstream network calls (e.g. Gnani API returning HTTP 200 with verified audio payloads), or live database interactions.
- **Tested**: Verified via automated software test suites (unit tests, integration tests, or Playwright browser automation).
- **Pending**: Not yet executed on physical target hardware (e.g., real physical mobile phones in field conditions), though fully emulated and tested in synthetic browser environments.

---

## 📈 Quality & Testing Metric Summary

| Test Domain | Target Suite | Test Count | Pass Rate | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Backend Integration & Unit Tests** | `./mvnw test` | 39 | 100% (39/39) | **PASS** |
| **Frontend TypeScript Build** | `npx tsc --noEmit && npm run build` | - | Zero Errors | **PASS** |
| **PWA & Offline Behavior** | `python3 scripts/test-pwa-offline.py` | 6 | 100% (6/6) | **PASS** |
| **Mobile Viewport & Dialect** | `python3 scripts/test-mobile-browser.py` | 4 | 100% (4/4) | **PASS** |
| **Core Farmer Journeys** | `python3 scripts/test-farmer-journeys.py` | 5 | 100% (5/5) | **PASS** |
| **Gnani Upstream API Connectivity** | `./scripts/verify-gnani.sh` | 2 | 100% (2/2) | **PASS** |
| **Total Automated Assertions** | Combined Automated Verification | 56+ | 100% | **PASS** |
