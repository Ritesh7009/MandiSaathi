# MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ) — Architecture Specification
**Phase 3: Real Gnani AI Integration and Verified Mandi Data Pipeline**

## 1. System Overview

MandiSaathi is a production-grade, multilingual, voice-first agricultural intelligence platform engineered for Indian farmers. Agricultural decision-making demands high trust, strict data provenance, regional language accessibility, and low-latency voice interactions.

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + TypeScript + Tailwind)"]
        UI["Multilingual Farmer Interface"]
        VoiceMic["Audio Recording (MediaRecorder API)"]
        AudioVis["Audio Reactive Visualizer (Web Audio Analyser)"]
        AudioPlay["Audio Player (Base64 WAV / Web Speech Fallback)"]
        TQuery["TanStack Query Cache"]
        APIClient["Centralized API Client"]
    end

    subgraph Backend["Spring Boot 3.3.5 Application (Java 21)"]
        Sec["Spring Security (Stateless / CORS)"]
        VoiceCtrl["VoiceAssistantController (/api/v1/voice/*)"]
        PriceCtrl["PriceRecordController (/api/v1/prices/*)"]
        VoiceSvc["VoiceAssistantService (Intent & Grounding)"]
        IngestSvc["MandiDataIngestionService (Agmarknet Sync)"]
        HealthSvc["HealthService (Truthful Diagnostics)"]
        Repos["Spring Data JPA Repositories"]
        
        subgraph GnaniLayer["Gnani Client Abstraction"]
            GnaniStt["GnaniSttServiceImpl (Prisma v2.5 / v3.0 REST)"]
            GnaniTts["GnaniTtsServiceImpl (Timbre v2.5 / v3.0 REST)"]
            GnaniSttStub["GnaniSttStubService (Dev Offline Sandbox)"]
            GnaniTtsStub["GnaniTtsStubService (Dev Offline Sandbox)"]
        end
    end

    subgraph Data["Data Layer"]
        Flyway["Flyway Migrations (V1, V2, V3 Schema)"]
        Postgres[("PostgreSQL 16 RDBMS")]
    end

    subgraph External["External Services (Server-Side Guarded)"]
        PrismaAPI["Gnani Prisma STT (https://api.vachana.ai/stt/v3)"]
        TimbreAPI["Gnani Timbre TTS (https://api.vachana.ai/api/v1/tts/inference)"]
        DataGov["Data.gov.in / Agmarknet (Resource API)"]
    end

    VoiceMic --> APIClient
    APIClient -->|Multipart Audio / JSON| Sec
    Sec --> VoiceCtrl
    Sec --> PriceCtrl
    VoiceCtrl --> VoiceSvc
    VoiceSvc --> GnaniStt
    VoiceSvc --> GnaniTts
    VoiceSvc --> Repos
    PriceCtrl --> IngestSvc
    IngestSvc --> DataGov
    IngestSvc --> Repos
    GnaniStt --> PrismaAPI
    GnaniTts --> TimbreAPI
    Repos --> Postgres
    Flyway -->|Bootstraps| Postgres
```

---

## 2. Voice AI Pipeline (Gnani Prisma & Timbre)

The end-to-end voice query lifecycle follows strict grounding and security constraints:

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer
    participant UI as React 19 Frontend
    participant Backend as Spring Boot Voice Gateway
    participant STT as Gnani Prisma STT
    participant DB as PostgreSQL Database
    participant TTS as Gnani Timbre TTS

    Farmer->>UI: Speaks query in Hindi / Punjabi / English
    UI->>UI: MediaRecorder captures audio chunk stream
    UI->>Backend: POST /api/v1/voice/audio (multipart audio/webm or audio/wav)
    Backend->>STT: POST https://api.vachana.ai/stt/v3 (with X-API-Key-ID)
    STT-->>Backend: Normalized Transcript & Detected Language
    Backend->>Backend: Intent classification & Entity extraction (Commodity, State, Mandi)
    alt Mandi or State is missing from query
        Backend->>DB: Check matching mandis for commodity
        Backend->>Backend: Generate polite clarification question listing options
    else Specific Mandi or State provided
        Backend->>DB: Query verified Agmarknet price records
        Backend->>Backend: Generate grounded vernacular market report
    end
    Backend->>TTS: POST https://api.vachana.ai/api/v1/tts/inference (Text, Voice, Lang)
    TTS-->>Backend: Binary audio/wav stream
    Backend-->>UI: VoiceQueryResponse (transcript, entities, priceRecords, audioBase64, engineNotice)
    UI->>Farmer: Plays audio response & renders verified APMC auction rate card
```

### Security & Operational Rules:
1. **Zero Secret Exposure**: All `GNANI_API_KEY`, `GNANI_TOKEN`, and `DATA_GOV_IN_API_KEY` credentials reside exclusively server-side in Spring Boot environment variables. No tokens are accessible in React or Vite code.
2. **Offline Development Sandbox**: When `GNANI_API_KEY` is not configured or `gnani.enabled=false`, the backend seamlessly operates `GnaniSttStubService` and `GnaniTtsStubService`, allowing full local testing without network flakiness.
3. **Truthful Diagnostics**: The `/api/v1/health` endpoint reports actual component statuses (`NOT_CONFIGURED`, `CONFIGURED`, `CONNECTED`, `DEGRADED`, `FAILED`, `STUBBED`).

---

## 3. Verified Mandi Data Pipeline (`data.gov.in` / Agmarknet)

### Architecture:
* **Service**: `MandiDataIngestionService`
* **Trigger Endpoint**: `POST /api/v1/prices/sync`
* **External Provider**: OGD Platform India (`data.gov.in`) Agmarknet current daily prices resource (`9ef84268-d588-465a-a308-a864a43d0070`).
* **Ingestion Integrity**:
  * Resolves commodities via uppercase code matching and alias mapping (`WHEAT`, `MUSTARD`, `PADDY`, `ONION`, etc.).
  * Resolves mandis via name and state normalization, auto-registering active markets if new.
  * Enforces price constraint: `min_price <= modal_price <= max_price`.
  * Deduplication via database unique constraint on `(commodity_code, mandi_code, price_date)` with upsert semantics (`insertedCount`, `updatedCount`, `skippedCount`).
  * Telemetry tag: `dataSource = 'Agmarknet (data.gov.in API)'` and `verified = true`.

---

## 4. Database Schema & Flyway Versioning

* **V1__initial_schema.sql**: Initial `commodities` and `mandis` reference registries.
* **V2__phase2_schema.sql**: Added `price_records`, `government_schemes`, and `complaints` tables with initial seed data.
* **V3__phase3_mandi_pipeline.sql**:
  * Adds unique constraint `uk_price_commodity_mandi_date` on `price_records(commodity_code, mandi_code, price_date)`.
  * Adds composite index `idx_price_records_commodity_date` on `price_records(commodity_code, price_date DESC)` for fast vernacular query resolution.

---

## 5. Frontend Architecture & Multi-Dialect UI

* **State Machine in `VoiceAssistant.tsx`**:
  `idle` → `recording` → `transcribing` → `processing` → `generating_audio` → `answered`, plus `permission_denied` and `error`.
* **Audio-Reactive Visualizer**: Skiper UI and Motion Primitives inspired concentric radar rings and frequency bars driven by browser `AudioContext` and `AnalyserNode`.
* **Audio Player**: Native base64 WAV playback for Gnani Timbre speech synthesis, with seamless fallback to browser `SpeechSynthesisUtterance`.
* **Localization**: Complete coverage for Hindi (`hi-IN` / Devanagari), Punjabi (`pa-IN` / Gurmukhi), and English (`en-IN` / Latin).
