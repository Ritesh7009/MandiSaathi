#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==============================================="
echo "Starting MandiSaathi Local Dev Stack"
echo "==============================================="

echo "Starting PostgreSQL container via Docker Compose..."
cd "$ROOT_DIR"
docker compose up -d postgres

echo "Waiting for PostgreSQL to become healthy..."
docker compose exec postgres pg_isready -U mandisaathi -d mandisaathi

echo ""
echo "PostgreSQL is running on host port \${POSTGRES_HOST_PORT:-5433}."
echo "To run backend:  cd backend && mvn spring-boot:run"
echo "To run frontend: cd frontend && npm run dev"
echo "To run full compose: docker compose up --build"
echo "==============================================="

