#!/usr/bin/env bash
set -euo pipefail

echo "==============================================="
echo "Building MandiSaathi - Full Monorepo Build"
echo "==============================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/2] Building Spring Boot Backend (Maven)..."
cd "$ROOT_DIR/backend"
mvn clean package -DskipTests

echo "[2/2] Building React Frontend (Vite)..."
cd "$ROOT_DIR/frontend"
npm run build

echo "==============================================="
echo "Build Completed Successfully!"
echo "Backend:  $ROOT_DIR/backend/target/mandisaathi-backend-0.1.0-SNAPSHOT.jar"
echo "Frontend: $ROOT_DIR/frontend/dist"
echo "==============================================="

