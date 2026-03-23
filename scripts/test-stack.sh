#!/bin/bash

# MTSF — Multi-Tenant SaaS Framework
# Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
# All rights reserved.
#
# Licensed under the MTSF Licence. See LICENCE file in the project root.

set -euo pipefail

# MTSF Test Stack Manager
# Usage:
#   ./scripts/test-stack.sh start   — Start test containers
#   ./scripts/test-stack.sh stop    — Stop test containers
#   ./scripts/test-stack.sh run     — Start, run tests, stop

ACTION="${1:-help}"

start_test_stack() {
  echo "[TEST] Starting test stack..."
  docker compose --profile test up -d
  echo "[TEST] Waiting for backend_test to be ready..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3011/api/health >/dev/null 2>&1; then
      echo "[TEST] Test backend is ready"
      return 0
    fi
    sleep 2
  done
  echo "[TEST] ERROR: Test backend did not become ready"
  exit 1
}

stop_test_stack() {
  echo "[TEST] Stopping test stack..."
  docker compose --profile test down
  echo "[TEST] Test stack stopped"
}

case "$ACTION" in
  start)
    start_test_stack
    ;;
  stop)
    stop_test_stack
    ;;
  run)
    start_test_stack
    echo "[TEST] Running tests..."
    # Add your test command here, e.g.:
    # cd backend && TEST_BASE_URL=http://localhost:3011 npx vitest run
    echo "[TEST] Tests complete"
    stop_test_stack
    ;;
  *)
    echo "Usage: $0 {start|stop|run}"
    exit 1
    ;;
esac
