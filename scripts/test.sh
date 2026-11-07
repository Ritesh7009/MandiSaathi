#!/usr/bin/env bash
set -euo pipefail

echo "==============================================="
echo "Running MandiSaathi Test Suites"
echo "==============================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/2] Running Backend Spring Boot Tests..."
cd "$ROOT_DIR/backend"
mvn clean test

echo "[2/2] Running Frontend TypeScript Check..."
cd "$ROOT_DIR/frontend"
npm run lint

echo "==============================================="
echo "All Verification Checks Passed!"
echo "==============================================="

