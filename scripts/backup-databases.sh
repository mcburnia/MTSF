#!/bin/bash

# MTSF — Multi-Tenant SaaS Framework
# Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
# All rights reserved.
#
# Licensed under the MTSF Licence. See LICENCE file in the project root.

set -euo pipefail

# MTSF Database Backup Script
# Retention: 7 daily, 4 weekly, 3 monthly

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${CONTAINER:-mtsf_postgres}"
DB_USER="${POSTGRES_USER:-mtsf}"
DB_NAME="${POSTGRES_DB:-mtsf}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}

echo "[BACKUP] Starting Postgres backup at $TIMESTAMP"

# Daily backup
DAILY_FILE="$BACKUP_DIR/daily/${DB_NAME}_${TIMESTAMP}.sql.gz"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DAILY_FILE"
echo "[BACKUP] Daily backup: $DAILY_FILE ($(du -h "$DAILY_FILE" | cut -f1))"

# Weekly backup (Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  cp "$DAILY_FILE" "$BACKUP_DIR/weekly/"
  echo "[BACKUP] Weekly backup created"
fi

# Monthly backup (1st of month)
if [ "$DAY_OF_MONTH" -eq "01" ]; then
  cp "$DAILY_FILE" "$BACKUP_DIR/monthly/"
  echo "[BACKUP] Monthly backup created"
fi

# Retention cleanup
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +28 -delete 2>/dev/null || true
find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +90 -delete 2>/dev/null || true

echo "[BACKUP] Complete"
