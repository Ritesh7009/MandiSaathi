# MandiSaathi — Environment & Deployment Guide

This guide details the complete procedure to install, configure, build, and deploy MandiSaathi in local and containerized environments.

---

## 1. Prerequisites & Version Requirements

| Technology | Minimum Version | Verified Runtime | Purpose |
| :--- | :--- | :--- | :--- |
| **Java Development Kit** | 21.0.0+ | OpenJDK 21.0.12.1 | Backend runtime & compiler |
| **Maven** | 3.9+ | Bundled via `./backend/mvnw` | Backend build tool & dependency manager |
| **Node.js** | 20.0.0+ | Node.js 20 / 22 | Frontend toolchain & compiler |
| **npm** | 10.0.0+ | npm 10.8+ | Frontend package manager |
| **PostgreSQL** | 16.0+ | PostgreSQL 16 Alpine | Primary transactional relational database |
| **Docker & Compose** | 24.0+ / Compose v2 | Docker Engine 26+ | Containerized execution environment |

---

## 2. Environment Configuration (`.env`)

MandiSaathi uses a central `.env` file at the monorepo root. Create `.env` by copying the provided `.env.example`:

```bash
cp .env.example .env
```

### Environment Variable Dictionary:

```ini
# Database Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mandisaathi
DB_USER=mandisaathi
DB_PASSWORD=mandisaathi_secret
POSTGRES_HOST_PORT=5433

# Backend Server Settings
SERVER_PORT=8080
BACKEND_PORT=8080
SPRING_PROFILES_ACTIVE=dev
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Frontend Settings
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8080

# Gnani Voice AI Credentials
# Set GNANI_ENABLED=true and provide your key to activate live Prisma STT and Timbre TTS
GNANI_ENABLED=false
GNANI_API_KEY=
GNANI_STT_URL=https://api.vachana.ai/stt/v3
GNANI_TTS_URL=https://api.vachana.ai/api/v1/tts/inference
GNANI_STT_MODEL=prisma-v2.5
GNANI_TTS_MODEL=timbre-v2.5
GNANI_TIMEOUT_MS=10000
GNANI_TTS_VOICE_HINDI=Nalini
GNANI_TTS_VOICE_PUNJABI=Nalini
GNANI_TTS_VOICE_ENGLISH=Kaveri

# Agmarknet / data.gov.in Mandi Data Integration
MANDI_DATA_ENABLED=false
DATA_GOV_IN_API_KEY=
DATA_GOV_IN_URL=https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
MANDI_DATA_LIMIT=100
MANDI_DATA_TIMEOUT_MS=15000
```

> **Security Rule**: `.env` is excluded in `.gitignore`. Never commit actual API keys or secrets to version control.

---

## 3. Deployment Option A: Full Stack with Docker Compose

Docker Compose provisions the PostgreSQL database, Spring Boot backend, and React frontend in an isolated bridge network (`mandisaathi-network`).

```bash
# 1. Ensure .env is populated with desired configurations
cp .env.example .env

# 2. Build and launch all containers in detached mode
docker compose up --build -d

# 3. View container health and logs
docker compose ps
docker compose logs -f
```

### Container Endpoints:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8080/api/v1/health`
- **PostgreSQL**: `localhost:5433` (mapped from container `5432` to avoid conflicts with host PostgreSQL)

---

## 4. Deployment Option B: Local Development Workflow

### Step 1: Start PostgreSQL Database
```bash
# Launch containerized PostgreSQL
docker compose up -d postgres

# Verify database health
pg_isready -h localhost -p 5433 -U mandisaathi -d mandisaathi
```

Flyway automatically applies database migrations (`V1__initial_schema.sql`, `V2__phase2_schema.sql`, and `V3__phase3_mandi_pipeline.sql`) upon Spring Boot application startup.

### Step 2: Start Spring Boot Backend
```bash
cd backend

# Source root environment variables
set -a
source ../.env
set +a

# Launch Spring Boot with dev profile
./mvnw spring-boot:run
```
Verify startup at: `http://localhost:8080/api/v1/health`.

### Step 3: Start React Frontend
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start Vite development server
npm run dev -- --host
```
Access the application at: `http://localhost:5173`.

---

## 5. Verification Scripts & Health Probes

```bash
# 1. Verify Gnani Voice AI authentication & connectivity
./scripts/verify-gnani.sh

# 2. Execute Backend unit/integration tests and Frontend TypeScript linter
./scripts/test.sh

# 3. Compile full production artifacts (JAR and Vite bundle)
./scripts/build.sh

# 4. Execute mobile browser Playwright verification suite
python3 scripts/test-mobile-browser.py
```
