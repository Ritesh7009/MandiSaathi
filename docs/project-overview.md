# MandiSaathi — Project Overview & Feature Inventory

## 1. System Inventory

This document provides a comprehensive inventory of all screens, backend services, persistence schemas, and functional capabilities implemented across Phases 1 through 4A of MandiSaathi.

---

## 2. Implemented Frontend Screens (7 Screens)

| Screen Name | Route Path | Core Functionality & Features |
| :--- | :--- | :--- |
| **1. Dashboard (Home)** | `/` | High-level market overview, daily featured commodity cards (Wheat, Mustard, Paddy, Onion), live APMC telemetry status badge, quick-action navigation pills, and dynamic localization. |
| **2. Voice Assistant** | `/assistant`<br>*(alias: `/voice`)* | Voice-first conversational interface with microphone recording via browser `MediaRecorder`, real-time audio reactive wave visualizer, conversational history, Base64 WAV audio playback (Gnani Timbre), extracted entity badges, and fallback text input form with prompt chips. |
| **3. Mandi Price Intelligence** | `/prices` | Multi-dimensional filter interface (Commodity, State, District, Mandi), key market summary cards (Highest, Lowest, Average modal prices), and tabular verified APMC records with arrival quantities and reporting dates. |
| **4. Mandi Comparison** | `/compare` | Arbitrage analysis tool allowing multi-mandi selection for a given crop, identifying highest vs lowest rates, calculating inter-mandi price spread (₹/qtl), and rendering multi-mandi comparison charts via Recharts. |
| **5. Government Schemes** | `/schemes` | Searchable directory of central and state farmer welfare schemes (PM-KISAN, PMFBY, Soil Health Card, e-NAM, Kisan Credit Card) with accessible accordion disclosures detailing benefits, eligibility, required documents, and direct links to official application portals. |
| **6. Complaint Registration** | `/complaints` | Two-step grievance intake workflow (Form Input $\rightarrow$ Confirmation Review) allowing farmers to report APMC irregularities (weighing, delayed payment, unauthorized deductions), issuing a structured reference number (`MS-2026-XXXXX`). |
| **7. Settings & Accessibility** | `/settings` | Dialect selection (English, Hindi, Punjabi), high-visibility font sizing toggle (`normal` vs `large` for enhanced legibility on mobile screens in sunlight), and an Indic language expansion roadmap. |

---

## 3. Backend Modules & Architecture Components

- **`com.mandisaathi.controller`**:
  - `HealthController`: Comprehensive health endpoint (`/api/v1/health`).
  - `VoiceAssistantController`: Voice endpoints (`/api/v1/voice/query`, `/api/v1/voice/audio`).
  - `PriceRecordController`: Price lookup, sync, and comparison endpoints (`/api/v1/prices/*`).
  - `CommodityController` & `MandiController`: Reference master data REST endpoints.
  - `GovernmentSchemeController`: Scheme catalog search and details.
  - `ComplaintController`: Grievance submission and tracking.
- **`com.mandisaathi.service`**:
  - `VoiceAssistantService`: Vernacular intent classification, entity extraction, district resolution, and factual grounding.
  - `PriceRecordService`: Price retrieval and cross-mandi spread comparison.
  - `MandiDataIngestionService`: Agmarknet / data.gov.in data ingestion, validation (`min <= modal <= max`), and deduplication.
  - `HealthService`: Live health aggregation.
- **`com.mandisaathi.client.gnani`**:
  - `GnaniSttService` / `GnaniSttServiceImpl`: RestClient implementation for Prisma STT v2.5 (`https://api.vachana.ai/stt/v3`).
  - `GnaniTtsService` / `GnaniTtsServiceImpl`: RestClient implementation for Timbre TTS v2.5 (`https://api.vachana.ai/api/v1/tts/inference`).
  - `GnaniSttStubService` / `GnaniTtsStubService`: Offline sandbox fallback generating synthetic 16kHz PCM WAV audio.

---

## 4. Database Entities & Flyway Migrations

- **`V1__initial_schema.sql`**: Initial baseline schema defining `commodities`, `mandis`, and `price_records` with sample APMC seed data.
- **`V2__phase2_schema.sql`**: Extends schema with `government_schemes` and `complaints` tables; adds localized Hindi/Punjabi entity names.
- **`V3__phase3_mandi_pipeline.sql`**: Enforces strict composite unique constraint `uq_price_record_daily` on `price_records(commodity_code, mandi_code, price_date)` to prevent duplicate ingestion filings.

---

## 5. Feature Implementation & Verification Status Matrix

### Category A: Implemented and Live-Verified
- [x] **Prisma STT Integration**: Live verified against `https://api.vachana.ai/stt/v3` with authentic `GNANI_API_KEY`.
- [x] **Timbre TTS Integration**: Live verified against `https://api.vachana.ai/api/v1/tts/inference` in Hindi, Punjabi, and English.
- [x] **Hindi Voice Query Workflow**: Live end-to-end verified with real audio transcription and speech generation.
- [x] **Punjabi Voice Query Workflow**: Live end-to-end verified with native Punjabi pronunciation and Ludhiana district resolution.
- [x] **English Voice Query Workflow**: Live end-to-end verified with Indian English synthesis.
- [x] **Non-Silent District Resolution**: Live verified — Ludhiana queries prompt the farmer about Khanna Mandi without silent substitution.
- [x] **Missing-Data & Ambiguity Guards**: Live verified — refuses to invent prices; prompts targeted clarification for missing locations.
- [x] **Market Comparison Guard**: Live verified — refuses arbitrary market recommendations when reporting date data is insufficient.
- [x] **Mobile Browser Ergonomics**: Live verified via Playwright Android Pixel 7 emulation under 3G network throttling.
- [x] **7 Frontend Screens**: All 7 screens fully implemented, styled, and functional.
- [x] **Backend Automated Test Suite**: 34/34 passing JUnit/Spring Boot integration tests.

### Category B: Implemented in Code, Operates in Baseline/Sandbox Mode
- [x] **Agmarknet Live Synchronization (`MandiDataIngestionService`)**: Fully implemented in code with validation, normalization, and deduplication logic. Operates against verified Agmarknet baseline seeds until an optional `DATA_GOV_IN_API_KEY` is provided in `.env`.
- [x] **Offline Development Sandbox**: Fallback stubs for STT and TTS are verified and functional for offline development.

### Category C: Planned Future Enhancements (Phase 4B+)
- [ ] **Offline-First PWA (Service Worker & IndexedDB Cache)**: Caching recent market prices for zero-connectivity field use.
- [ ] **Direct e-NAM Trading API Integration**: Direct electronic bidding integration with National Agriculture Market portals.
- [ ] **Expanded Indic Languages**: Adding Gujarati, Marathi, Telugu, and Kannada voice models.
- [ ] **Automated Daily Cron Ingestion**: Automatic nightly scheduling of Agmarknet delta syncs via Spring `@Scheduled`.
