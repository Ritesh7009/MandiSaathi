# MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ)

> **Phase 3: Real Gnani AI Integration and Verified Mandi Data Pipeline**  
> Multilingual, voice-first agricultural market intelligence platform engineered for Indian farmers.

---

## 🌾 Project Overview

MandiSaathi empowers Indian farmers with accessible, trustworthy market intelligence. By prioritizing regional dialects (Hindi, Punjabi, English) and natural voice interactions, it bridges the digital divide in rural agricultural ecosystems.

### Core Capabilities:
1. **Multilingual Voice Assistant (Phase 3)**:
   - Voice audio recording via browser `MediaRecorder` API.
   - Server-side speech-to-text with **Gnani Prisma v2.5 / v3.0 REST STT**.
   - Spoken audio synthesis with **Gnani Timbre v2.5 / v3.0 REST TTS** (WAV base64 streaming).
   - Audio-reactive frequency visualizer (Skiper UI & Motion Primitives).
   - Vernacular NLP: Intent classification (`MANDI_PRICE_LOOKUP`, `MANDI_COMPARISON`, `COMMODITY_SEARCH`, etc.) and entity extraction (Commodity, State, Mandi).
   - Clarification handling: When a farmer names a crop without a market, MandiSaathi asks a polite vernacular clarification question listing available mandis.
   - Multi-dialect support: Hindi (हिन्दी / `hi-IN`), Punjabi (ਪੰਜਾਬੀ / `pa-IN`), and English (`en-IN`).
2. **Verified Mandi Data Pipeline (Phase 3)**:
   - Automated ingestion from official **Agmarknet / data.gov.in (OGD Platform India)** API.
   - Enforces mathematical integrity (`min <= modal <= max`).
   - Deduplication via Flyway V3 composite constraint `(commodity_code, mandi_code, price_date)`.
   - On-demand sync trigger via `POST /api/v1/prices/sync` with live UI feedback.
3. **Mandi Price Intelligence**: Multi-dimensional filtering by commodity, state, district, and APMC mandi yard, aggregate market metrics, and verified daily arrival and modal rates.
4. **Mandi Comparison**: Multi-mandi cross-market arbitrage comparison, best modal rate indicator, inter-mandi price spread analysis, and Recharts multi-mandi comparison charts.
5. **Government Schemes**: Searchable scheme directory (PM-KISAN, PMFBY, Soil Health Card, e-NAM, Kisan Credit Card) with accessible accordion disclosures, eligibility, documents, and official application portals.
6. **Complaint Registration**: 2-step grievance recording workflow (Input -> Review -> Confirmation) issuing unique reference numbers (`MS-2026-XXXXX`) for transparency and collective farmer advocacy.
7. **Accessibility & Settings**: Complete interface localization across English, Hindi, and Punjabi, high-visibility font sizing toggle (`normal` vs `large`), and Indic language roadmap.

---

## 📁 Repository Structure

```text
mandisaathi/
├── backend/                   # Spring Boot 3.3.5 Application (Java 21)
│   ├── src/main/java/         # Layered architecture
│   │   └── com/mandisaathi/
│   │       ├── client/gnani/  # Gnani Prisma STT & Timbre TTS clients & offline stubs
│   │       ├── config/        # Security, RestClient, Gnani & Mandi properties
│   │       ├── controller/    # REST API Controllers (Health, Voice, Prices, Schemes, Complaints)
│   │       ├── dto/           # Immutable record DTOs & response contracts
│   │       ├── entity/        # JPA Entities (Commodity, Mandi, PriceRecord, Scheme, Complaint)
│   │       ├── exception/     # Global exception handling & custom domain errors
│   │       ├── repository/    # Spring Data JPA Repositories
│   │       └── service/       # Domain business logic & data pipelines
│   ├── src/main/resources/    # application.yml & Flyway migrations (V1, V2, V3)
│   ├── src/test/              # Comprehensive MockMvc & integration test suites (30 tests)
│   ├── Dockerfile             # Multi-stage Eclipse Temurin 21 build
│   └── pom.xml                # Maven project descriptor
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/components/        # Reusable UI components & visualizers
│   ├── src/context/           # LanguageContext with English, Hindi, Punjabi translations
│   ├── src/pages/             # VoiceAssistant, PriceIntelligence, MandiComparison, Schemes, Complaints
│   ├── src/services/          # Centralized ApiClient (REST & Multipart Audio)
│   ├── src/types/             # Strict TypeScript definitions
│   ├── Dockerfile             # Multi-stage Node 22 + Nginx Alpine build
│   └── tailwind.config.js     # Agricultural design system color tokens
├── database/                  # Database initialization and standalone migrations
│   ├── init.sql               # PostgreSQL container initialization
│   └── migrations/            # Versioned SQL migrations (mirrored with backend Flyway)
├── docs/                      # Architectural specifications
│   └── architecture.md        # High-level architecture, voice pipeline & data provenance
├── scripts/                   # Developer automation utilities
│   ├── dev.sh                 # Launches local PostgreSQL and prints dev instructions
│   ├── build.sh               # Compiles backend JAR and builds frontend dist bundle
│   └── test.sh                # Executes backend Maven tests and frontend TypeScript linters
├── docker-compose.yml         # Container orchestration (PostgreSQL 16, Backend, Frontend)
├── .env.example               # Root environment variable template
├── .gitignore                 # Monorepo version control ignore rules
└── README.md                  # This file
```

---

## 🎨 Design System

MandiSaathi uses an authentic agricultural technology visual identity:
* **Forest Green** (`#174B35`): Trust, crop health, primary actions.
* **Harvest Gold** (`#D7B66A`): Maturity, grain prosperity, active accents.
* **Warm Ivory** (`#F5F3EA`): High-legibility paper-like neutral background.
* **Charcoal** (`#25352C`): High-contrast readable typography.

**Typography**:
* **Inter**: Latin UI elements and numerical data.
* **Noto Sans Devanagari**: Hindi (हिन्दी) vernacular typography.
* **Noto Sans Gurmukhi**: Punjabi (ਪੰਜਾਬੀ) vernacular typography.

---

## 🚀 Quickstart

### Prerequisites
* **Java 21** (`openjdk 21`)
* **Maven 3.9+** (or use `./backend/mvnw`)
* **Node.js 20+** and **npm**
* **Docker & Docker Compose**

### Option A: Run Full Stack with Docker Compose

```bash
# 1. Clone & copy environment variables
cp .env.example .env

# Optional: Add your Gnani AI and data.gov.in credentials in .env:
# GNANI_API_KEY=your_gnani_api_key
# GNANI_ENABLED=true
# DATA_GOV_IN_API_KEY=your_api_key

# 2. Launch PostgreSQL, Spring Boot Backend, and React Frontend
docker compose up --build
```
* **Frontend**: http://localhost:5173
* **Backend API**: http://localhost:8080/api/v1/health
* **PostgreSQL**: `localhost:5433` (mapped from container `5432` to prevent host conflicts)

### Option B: Local Development

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Run Backend
cd backend
mvn clean spring-boot:run

# 3. In another terminal, run Frontend
cd frontend
npm install
npm run dev
```

---

## 🧪 Verification & Testing

Execute all automated checks with the verification scripts:

```bash
# Run Backend Maven unit & integration tests + Frontend TypeScript check
./scripts/test.sh

# Run complete production build for both backend and frontend
./scripts/build.sh
```

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Comprehensive system health check (DB, Gnani STT/TTS, Mandi Data Source, version) |
| `POST` | `/api/v1/voice/audio` | **Phase 3**: Multipart voice query upload (`audio`, `language`), STT + Grounding + TTS |
| `POST` | `/api/v1/voice/query` | **Phase 3**: Vernacular text query grounding, entity extraction & speech synthesis |
| `POST` | `/api/v1/prices/sync` | **Phase 3**: Trigger live synchronization of daily market arrivals from Agmarknet |
| `GET` | `/api/v1/prices` | Query verified price records by `commodityCode` and `mandiCode` |
| `POST` | `/api/v1/prices/compare` | Arbitrage comparison across mandis for a given commodity |
| `GET` | `/api/v1/commodities` | List verified agricultural produce (supports `?category=CEREALS`) |
| `GET` | `/api/v1/commodities/{code}` | Retrieve single commodity by unique code (e.g. `WHEAT`, `MUSTARD`) |
| `GET` | `/api/v1/mandis` | List verified agricultural mandis (supports `?state=Punjab`) |
| `GET` | `/api/v1/mandis/{code}` | Retrieve single mandi by code (e.g. `KHANNA_PB`) |
| `GET` | `/api/v1/schemes` | List government schemes with category and keyword search |
| `POST` | `/api/v1/complaints` | Submit farmer grievance and receive reference number |

---

## 🛡️ Agricultural & Engineering Integrity Rules

1. **Zero Client Secrets**: Gnani AI and data.gov.in credentials reside strictly on the Spring Boot backend and are never exposed in browser bundles.
2. **No Fake Prices**: Live market prices are never fabricated or simulated. Responses are strictly grounded in verified APMC auction filings.
3. **No Non-Functional Buttons**: Every interactive control performs a real operation.
4. **Resilient Offline Sandbox**: When external API keys are omitted, the application operates in an honest, verified development mode without simulated successes.
5. **Truthful Diagnostics**: Health check reports exact component states (`CONNECTED`, `CONFIGURED`, `NOT_CONFIGURED`, `FAILED`, `STUBBED`).
