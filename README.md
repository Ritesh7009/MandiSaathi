# MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ)

> **Phase 2: Product UI/UX Implementation Verified**  
> Multilingual, voice-first agricultural market intelligence platform engineered for Indian farmers.

---

## 🌾 Project Overview

MandiSaathi empowers Indian farmers with accessible, trustworthy market intelligence. By prioritizing regional dialects (Hindi, Punjabi, English) and natural voice interactions, it bridges the digital divide in rural agricultural ecosystems.

### Core Capabilities (Phase 2):
1. **Screen 1: Farmer Home Dashboard**: Time-of-day vernacular greetings, prominent microphone CTA, suggested query chips, monitored APMC mandis, and recent conversation history.
2. **Screen 2: Voice Assistant**: Audio-reactive waveform visualizer, full state machine (`idle`, `recording`, `listening`, `processing`, `answered`, `error`), audio playback with Web Speech fallback, and transparent Gnani AI v2.5 integration boundary.
3. **Screen 3: Mandi Price Intelligence**: Multi-dimensional filtering by commodity, state, district, and APMC mandi yard, aggregate market statistics (Cult UI MetricTiles), and verified daily arrival and modal rates.
4. **Screen 4: Mandi Comparison**: Multi-mandi cross-market arbitrage comparison, best modal rate indicator, inter-mandi price spread analysis, and Recharts multi-mandi modal/min/max comparison chart.
5. **Screen 5: Government Schemes**: Searchable scheme directory (PM-KISAN, PMFBY, Soil Health Card, e-NAM, Kisan Credit Card) with accessible accordion disclosures (Motion Primitives), eligibility, documents, application instructions, and official links.
6. **Screen 6: Complaint Registration**: 2-step grievance recording workflow (Input -> Review -> Confirmation) issuing unique reference numbers (`MS-2026-XXXXX`) for transparency and collective farmer advocacy with statutory legal disclaimer.
7. **Screen 7: Language & Accessibility**: Complete interface localization across English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ), high-visibility font sizing toggle (`normal` vs `large`), and Indic language expansion roadmap.

---

## 📁 Repository Structure

```text
mandisaathi/
├── backend/                   # Spring Boot 3.3 Application (Java 21)
│   ├── src/main/java/         # Layered source code (controller, service, repository, entity, dto, config, client)
│   ├── src/main/resources/    # application.yml & Flyway migrations (db/migration/V1__*.sql)
│   ├── src/test/              # MockMvc & integration test suites
│   ├── Dockerfile             # Multi-stage Eclipse Temurin 21 build
│   └── pom.xml                # Maven project descriptor
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/components/        # Navbar, HealthBanner, VoiceDiagnostic, CommoditiesView, MandisView
│   ├── src/context/           # LanguageContext with English, Hindi, Punjabi translations
│   ├── src/services/          # Centralized ApiClient
│   ├── src/types/             # Strict TypeScript definitions
│   ├── Dockerfile             # Multi-stage Node 22 + Nginx Alpine build
│   └── tailwind.config.js     # Agricultural design system color tokens
├── database/                  # Database initialization and standalone migrations
│   ├── init.sql               # PostgreSQL container initialization
│   └── migrations/            # Versioned SQL migrations (mirrored with backend Flyway)
├── docs/                      # Architectural specifications
│   └── architecture.md        # High-level architecture, domain model, security & voice design
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

*Design Rule*: Avoided gratuitous drop shadows, heavy cards, and decorative widgets. Every UI button provides tangible user interaction.

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

Run all automated checks with the verification scripts:

```bash
# Run Backend Maven unit & integration tests + Frontend TypeScript check
./scripts/test.sh

# Run complete production build for both backend and frontend
./scripts/build.sh
```

---

## 📡 API Reference (Phase 1)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Comprehensive system health check (DB connectivity, Gnani status, version) |
| `GET` | `/api/v1/commodities` | List verified agricultural produce (supports `?category=CEREALS`) |
| `GET` | `/api/v1/commodities/{code}` | Retrieve single commodity by unique code (e.g. `WHEAT`, `MUSTARD`) |
| `GET` | `/api/v1/mandis` | List verified agricultural mandis (supports `?state=Punjab`) |
| `GET` | `/api/v1/mandis/{code}` | Retrieve single mandi by code (e.g. `KHANNA_PB`) |

---

## 🛡️ Agricultural & Engineering Integrity Rules

1. **No Fake Prices**: Live market prices are never fabricated or hardcoded.
2. **Zero Client Secrets**: Gnani API keys are strictly stored on the backend and never exposed in browser bundles.
3. **No Non-Functional Buttons**: Every button performs an active operation (language swap, query refresh, microphone stream validation, category filter).
4. **Resilient Error Handling**: Centralized RFC-compliant error envelopes and user-friendly error recovery.

