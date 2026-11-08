# MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ)

Multilingual, voice-first agricultural market intelligence platform engineered for Indian farmers.

---

## 1. Project Title and Description

**MandiSaathi** is an enterprise-grade agricultural market intelligence platform designed to eliminate information asymmetry in Indian agricultural produce marketing. The platform pairs regional voice recognition in Hindi, Punjabi, and Indian English with verified agricultural market price telemetry from official Agricultural Produce Market Committee (APMC) mandis across India.

---

## 2. Problem Statement

Smallholder and marginal farmers in India produce over 86% of the country's agricultural output but operate at a severe disadvantage when selling produce at local APMC mandis. Primary obstacles include:
- **Literacy and Linguistic Barriers**: Most official price portals and market dashboards are text-heavy and formatted in English or formal administrative Hindi, creating steep usability barriers for rural producers.
- **Inter-Mandi Price Dispersion**: Substantial price arbitrage exists between neighboring mandis (often exceeding ₹100–₹300 per quintal), yet farmers lack real-time comparative visibility before transport.
- **Data Opacity and Extrapolation Risk**: Generic digital tools frequently present extrapolated, unverified, or outdated market averages, leading farmers to negotiate on false price expectations.

---

## 3. Proposed Solution

MandiSaathi resolves these challenges by providing:
1. **Conversational Regional Voice Interface**: Farmers query mandi prices by speaking naturally in their local dialect (Hindi, Punjabi, or English) via browser audio recording.
2. **Deterministic Data Grounding**: Voice queries are mapped to verified database filings ingested from the official Agmarknet catalog (`data.gov.in`). Prices are never synthesized, estimated, or fabricated.
3. **Domain-Specific Safeguards**: The system enforces district-aware location resolution (preventing silent substitution of markets), comparative data sufficiency guards (requiring at least two markets reporting on the same auction date), and missing-data transparency.
4. **Natural Audio Synthesis**: Factual market responses are synthesized into fluent, dialect-accurate spoken audio using Gnani.ai's Timbre TTS engine.

---

## 4. Key Features

- **Voice Assistant**: Multipart audio streaming, real-time audio visualizer, automatic language detection (`hi-IN`, `pa-IN`, `en-IN`), entity extraction (Commodity, District, Mandi, State), and spoken audio playback.
- **Mandi Price Intelligence**: Multi-dimensional filtering by crop category, state, district, and APMC yard, displaying modal, minimum, and maximum prices alongside reported arrival volumes.
- **Mandi Comparison**: Cross-mandi arbitrage spread calculator (₹/quintal) with comparative visual bar charts rendered via Recharts.
- **Government Schemes Directory**: Catalog of major welfare programs (PM-KISAN, PMFBY, Soil Health Card, e-NAM, Kisan Credit Card) detailing eligibility criteria, documentation, and official portal links.
- **Farmer Grievance Logging**: Structured grievance intake tracking APMC irregularities (unauthorized deductions, weighing disputes) with unique tracking reference numbers (`MS-2026-XXXXX`).
- **High-Visibility Accessibility**: Font-scaling toggle (`normal` vs `large`) and responsive layouts optimized for mobile devices operating under outdoor sunlight.

---

## 5. Target Users

- **Smallholder Farmers**: Seeking rapid, voice-driven price discovery before transporting produce to market.
- **Farmer Producer Organizations (FPOs)**: Analyzing price spreads to aggregate and dispatch bulk produce to optimal regional mandis.
- **Agricultural Extension Workers & Krishi Vigyan Kendras (KVKs)**: Advising local farmers on fair market values and government schemes.
- **Rural Traders & Commission Agents**: Referencing official APMC daily benchmark rates.

---

## 6. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Java | 21 (LTS) | Core application platform |
| **Backend Framework** | Spring Boot | 3.3.5 | REST controllers, services, security |
| **Database** | PostgreSQL | 16-alpine | Relational persistence |
| **Database Migrations** | Flyway | 10.x | Schema versioning (V1, V2, V3, V4) |
| **Frontend Runtime** | React | 19.0.0 | Single-page presentation layer |
| **Language** | TypeScript | 5.7.2 | Static type safety |
| **Build Tooling** | Vite | 6.0.0 | Frontend compilation & bundling |
| **PWA & Offline** | Service Worker & IndexedDB | W3C Standard | Offline app shell, price caching, stale warning |
| **Styling** | Tailwind CSS | 3.4.17 | Agricultural design system styling |
| **State Management** | TanStack Query | 5.60.0 | Server state caching & invalidation |
| **Voice AI (STT)** | Gnani Prisma STT | v2.5 / v3.0 | Cloud speech-to-text transcription |
| **Voice AI (TTS)** | Gnani Timbre TTS | v2.5 / v3.0 | Cloud text-to-speech voice synthesis |
| **Data Source** | data.gov.in (OGD) | Agmarknet Feed | Official daily APMC auction prices |
| **Containerization** | Docker & Compose | 24+ / Compose v2 | Multi-container orchestration |

---

## 7. System Architecture

```mermaid
flowchart TD
    subgraph FarmerUser["Farmer Interaction"]
        Farmer(["🧑🌾 Farmer"])
    end

    subgraph Presentation["Frontend Client (React 19 + TypeScript + PWA)"]
        UI["Voice Assistant UI (MediaRecorder)"]
        SW["Service Worker (Cache Storage)"]
        IDB[("IndexedDB Structured Price Cache")]
        Visualizer["Audio Waveform Visualizer"]
        Player["Spoken Audio Player"]
    end

    subgraph Application["Backend Application (Spring Boot 3.3.5 on Java 21)"]
        VoiceCtrl["VoiceAssistantController"]
        VoiceSvc["VoiceAssistantService"]
        NLPEngine["Intent & Entity Extraction Engine"]
        PriceSvc["PriceRecordService"]
        IngestSvc["MandiDataIngestionService (@Scheduled Cron)"]
    end

    subgraph Data["Persistence Layer"]
        Postgres[("PostgreSQL 16 Database\n(Flyway V1..V4)")]
    end

    subgraph External["External Cloud Services"]
        PrismaSTT["Gnani Prisma STT (api.vachana.ai)"]
        TimbreTTS["Gnani Timbre TTS (api.vachana.ai)"]
        Agmarknet["data.gov.in / Agmarknet API"]
    end

    Farmer -->|Voice Query| UI
    Farmer -->|Browse Cached Prices| IDB
    UI -->|Service Worker Intercept| SW
    SW -->|Fetch Remote| VoiceCtrl
    VoiceCtrl --> VoiceSvc
    VoiceSvc -->|Audio Stream| PrismaSTT
    PrismaSTT -->|Transcript| VoiceSvc
    VoiceSvc --> NLPEngine
    NLPEngine --> PriceSvc
    PriceSvc --> Postgres
    PriceSvc -->|Price Records| VoiceSvc
    VoiceSvc -->|Response Text| TimbreTTS
    TimbreTTS -->|Synthesized WAV| VoiceSvc
    VoiceSvc -->|JSON + Audio Payload| UI
    UI -->|Persist Prices| IDB
    UI --> Player
    Player -->|Audio Playback| Farmer
    IngestSvc -->|Nightly Delta Ingestion| Agmarknet
    IngestSvc -->|Persist Ingestion Runs| Postgres
```
        DataGov["Agmarknet Feed (data.gov.in)"]
    end

    Farmer -->|"Spoken Voice Query"| UI
    UI -->|"Multipart Audio / JSON"| VoiceCtrl
    VoiceCtrl --> VoiceSvc
    VoiceSvc -->|"Audio Stream"| PrismaSTT
    PrismaSTT -->|"Transcript + Detected Language"| VoiceSvc
    VoiceSvc --> NLPEngine
    NLPEngine -->|"Extracted Crop, District, State"| PriceSvc
    PriceSvc -->|"Query Modal Rates"| Postgres
    PriceSvc -->|"Grounded Response Text"| VoiceSvc
    VoiceSvc -->|"Vernacular Text"| TimbreTTS
    TimbreTTS -->|"16kHz Linear PCM WAV"| VoiceSvc
    VoiceSvc -->|"Base64 Audio + Verified Metrics"| VoiceCtrl
    VoiceCtrl --> Player
    Player -->|"Audio Playback + Visual Metric Card"| Farmer

    IngestSvc -->|"Daily Feed Ingestion"| DataGov
    IngestSvc -->|"Validated Daily Records"| Postgres
```

---

## 8. Voice Processing Workflow

1. **Audio Capture**: The browser records user speech via `navigator.mediaDevices.getUserMedia` and the `MediaRecorder` API in standard WAV or WebM containers.
2. **Audio Streaming**: Audio is uploaded via multipart form data (`POST /api/v1/voice/audio`) along with an optional language locale hint.
3. **Prisma STT Transcription**: The backend passes the audio binary directly to `https://api.vachana.ai/stt/v3` using RestClient with the `X-API-Key-ID` header, receiving the transcribed text and detected language (`hi-IN`, `pa-IN`, `en-IN`).
4. **Entity Extraction & Grounding**: The NLP engine normalizes vernacular terms (e.g., *कनक*, *गेहूँ*, *गेहूं* $\rightarrow$ `WHEAT`) and checks location entities.
5. **District-Aware Resolution**: A query mentioning a district (such as Ludhiana) queries all registered APMCs within that district. If Khanna Mandi is the single registered yard, the assistant discloses this and asks for confirmation rather than silently defaulting.
6. **Timbre TTS Synthesis**: Factual response text is synthesized via `https://api.vachana.ai/api/v1/tts/inference`, generating a 16kHz linear PCM WAV stream.
7. **Client Playback**: The audio is returned as a Base64-encoded WAV string, which the client decodes and plays immediately.

---

## 9. Gnani AI Integration

MandiSaathi uses a single `GNANI_API_KEY` authenticated via the `X-API-Key-ID` header:

| Engine | Endpoint URL | Model | Voices |
| :--- | :--- | :--- | :--- |
| **Prisma STT** | `https://api.vachana.ai/stt/v3` | `prisma-v2.5` | Multi-speaker adaptive |
| **Timbre TTS** | `https://api.vachana.ai/api/v1/tts/inference` | `timbre-v2.5` | `Nalini` (Hindi, Punjabi)<br>`Kaveri` (English) |

In offline or sandbox development mode, the application falls back to `GnaniSttStubService` and `GnaniTtsStubService`, generating synthetic 16kHz WAV tones labeled as **`Local Sandbox Synthetic Audio`**.

---

## 10. Mandi Data Integration

- **Data Provider**: Open Government Data (OGD) Platform India (`data.gov.in`).
- **Resource ID**: `9ef84268-d588-465a-a308-a864a43d0070` (Daily Mandi Prices of Various Commodities Across India).
- **Validation Engine**: Guarantees $\text{min\_price} \le \text{modal\_price} \le \text{max\_price}$. Inverted values are corrected, and out-of-range modal prices are clamped.
- **Deduplication**: Enforced via composite unique index `uq_price_record_daily` on `(commodity_code, mandi_code, price_date)`.
- **Manual Sync**: Available via `POST /api/v1/prices/sync`.

---

## 11. Database Architecture

Database schema versioning is managed via Flyway:
- **`V1__initial_schema.sql`**: Core tables: `commodities`, `mandis`, and `price_records`.
- **`V2__phase2_schema.sql`**: Extended tables: `government_schemes` and `complaints`.
- **`V3__phase3_mandi_pipeline.sql`**: Deduplication constraint `uq_price_record_daily`.

```sql
-- Core Price Record Table
CREATE TABLE price_records (
    id BIGSERIAL PRIMARY KEY,
    commodity_code VARCHAR(50) NOT NULL REFERENCES commodities(code),
    mandi_code VARCHAR(50) NOT NULL REFERENCES mandis(code),
    min_price NUMERIC(10,2) NOT NULL,
    max_price NUMERIC(10,2) NOT NULL,
    modal_price NUMERIC(10,2) NOT NULL,
    price_date DATE NOT NULL,
    arrival_quantity NUMERIC(10,2),
    unit VARCHAR(20) DEFAULT 'QUINTAL',
    data_source VARCHAR(100) DEFAULT 'Agmarknet / data.gov.in',
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_price_record_daily UNIQUE (commodity_code, mandi_code, price_date)
);
```

---

## 12. API Endpoint Documentation

| Method | URI Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Comprehensive subsystem health and connection status |
| `POST` | `/api/v1/voice/query` | Vernacular text query processing and speech synthesis |
| `POST` | `/api/v1/voice/audio` | Multipart audio voice query processing (STT $\rightarrow$ Grounding $\rightarrow$ TTS) |
| `GET` | `/api/v1/prices` | Query verified price records by `commodityCode` and `mandiCode` |
| `POST` | `/api/v1/prices/compare` | Multi-mandi price arbitrage and spread comparison |
| `POST` | `/api/v1/prices/sync` | Trigger synchronization with official `data.gov.in` feed |
| `GET` | `/api/v1/commodities` | List verified agricultural commodities |
| `GET` | `/api/v1/commodities/{code}` | Retrieve single commodity details |
| `GET` | `/api/v1/mandis` | List verified APMC market yards (supports `?state=Punjab`) |
| `GET` | `/api/v1/mandis/{code}` | Retrieve single mandi details |
| `GET` | `/api/v1/schemes` | Search and retrieve government schemes |
| `POST` | `/api/v1/complaints` | Register a farmer grievance and issue reference number |
| `GET` | `/api/v1/complaints` | List registered grievances |
| `GET` | `/api/v1/complaints/{ref}` | Retrieve complaint status by reference number |

*For complete payload and response schemas, see [`docs/api-reference.md`](docs/api-reference.md).*

---

## 13. Screenshots Section

Mobile responsive screenshots captured during automated Playwright Android Pixel 7 testing:

| Initial Viewport | Live Hindi Query Result |
| :---: | :---: |
| ![Mobile Initial](docs/screenshots/01_mobile_initial.png) | ![Hindi Result](docs/screenshots/02_mobile_hindi_result.png) |
| *Clean agricultural UI with mobile bottom navigation* | *Verified price card with Live Gnani audio playback* |

| Punjabi District Resolution | Throttled 3G Network Resilience |
| :---: | :---: |
| ![Punjabi Result](docs/screenshots/03_mobile_punjabi_ludhiana.png) | ![Slow Network](docs/screenshots/04_mobile_slow_network_result.png) |
| *Non-silent Ludhiana to Khanna Mandi resolution* | *Graceful rendering under simulated rural 3G throttling* |

---

## 14. Installation Instructions

### Prerequisites
- **Java Development Kit**: JDK 21+ (`openjdk 21`)
- **Node.js**: v20+ or v22+
- **Docker & Compose**: Docker Engine 24+ with Compose v2
- **Git**

```bash
# Clone the repository
git clone https://github.com/your-username/mandisaathi.git
cd mandisaathi
```

---

## 15. Environment Configuration

Copy the example configuration to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to configure your credentials:
```ini
# To enable live Gnani AI voice capabilities:
GNANI_ENABLED=true
GNANI_API_KEY=your_gnani_api_key_here
```

---

## 16. Local Development Instructions

### 1. Launch PostgreSQL Container
```bash
docker compose up -d postgres
```

### 2. Launch Backend
```bash
cd backend
set -a && source ../.env && set +a
./mvnw spring-boot:run
```
Backend starts on: `http://localhost:8080`.

### 3. Launch Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```
Frontend runs on: `http://localhost:5173`.

---

## 17. Docker Setup

To build and run the entire platform within isolated Docker containers:
```bash
# Build and start all three containers
docker compose up --build -d

# Verify container statuses
docker compose ps
```
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8080/api/v1/health`
- **PostgreSQL**: `localhost:5433`

---

## 18. Testing Instructions

MandiSaathi includes comprehensive automated test suites:

```bash
# 1. Run all backend JUnit/MockMvc tests & frontend TypeScript checks
./scripts/test.sh

# 2. Run Gnani AI upstream authentication verification
./scripts/verify-gnani.sh

# 3. Run Android mobile emulation Playwright tests
python3 scripts/test-mobile-browser.py

# 4. Run Phase 4B PWA and IndexedDB offline verification suite
python3 scripts/test-pwa-offline.py

# 5. Compile full production JAR and Vite bundle
./scripts/build.sh
```

---

## 19. Security Considerations

- **Server-Side Secret Isolation**: Third-party API keys (`GNANI_API_KEY`, `DATA_GOV_IN_API_KEY`) reside exclusively on the server and are never exposed in browser bundles.
- **SQL Injection Prevention**: All queries execute via Spring Data JPA and Hibernate with parameterized binding.
- **CORS Protection**: Access is restricted to trusted local origin domains.
- **Audio Upload Protection**: Audio payloads are validated and limited to 15 MB to prevent resource exhaustion attacks.

---

## 20. Known Limitations

- **Reporting Dates vs Real-Time Auctions**: Mandi prices reflect daily closed auction records filed with APMC market committees, not real-time continuous stock-ticker feeds.
- **Offline Voice Processing Boundary**: Real-time voice recognition (Prisma STT) and voice synthesis (Timbre TTS) require an active network connection to Gnani.ai. When offline, price intelligence remains accessible via structured IndexedDB cache with clear reporting dates and stale warnings, while voice features cleanly display connectivity notices.
- **Geographic Seed Scope**: The verified baseline seed tracks 8 primary benchmark APMCs across 7 states/UTs; additional mandis are provisioned dynamically during ingestion.
- **Legal Scope of Grievances**: The tracking identifier issued by MandiSaathi (`MS-2026-XXXXX`) is an internal reference number for community advocacy and is **not** an official Government of India CPGRAMS docket acknowledgement.

*For complete details, see [`docs/known-limitations.md`](docs/known-limitations.md).*

---

## 21. Future Scope

- **Direct e-NAM Integration**: Bid placement and trade settlement directly through National Agriculture Market portals.
- **Indic Language Expansion**: Voice recognition and synthesis support for Marathi, Gujarati, Telugu, and Kannada.
- **Automated Weather & Logistics Optimization**: Integrating local weather forecasts and transport route costs into mandi arbitrage recommendations.

---

## 22. Acknowledgements & Data Attribution

- **Ministry of Agriculture & Farmers Welfare, Government of India**: For open access to daily market arrival data via Agmarknet and the Open Government Data (OGD) Platform India (`data.gov.in`).
- **Gnani.ai**: For providing state-of-the-art Indic speech models (Prisma STT and Timbre TTS).
- **APMC Market Committees**: For daily collation of agricultural market prices across India.
