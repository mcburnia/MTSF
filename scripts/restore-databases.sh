#!/bin/bash
set -euo pipefail

# MTSF Database Restore Script
# Usage: ./scripts/restore-databases.sh path/to/backup.sql.gz

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  find ./backups -name "*.sql.gz" -type f | sort -r | head -20
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="${CONTAINER:-mtsf_postgres}"
DB_USER="${POSTGRES_USER:-mtsf}"
DB_NAME="${POSTGRES_DB:-mtsf}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[RESTORE] File: $BACKUP_FILE"
echo "[RESTORE] Target: $DB_NAME on $CONTAINER"
echo ""
echo "WARNING: This will drop and recreate the database '$DB_NAME'."
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "[RESTORE] Cancelled"
  exit 0
fi

echo "[RESTORE] Dropping and recreating database..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "[RESTORE] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "[RESTORE] Complete"
