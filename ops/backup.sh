#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 2
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/ttm-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" | gzip -9 > "$BACKUP_FILE"

if [[ -n "${BACKUP_BUCKET:-}" ]]; then
  case "$BACKUP_BUCKET" in
    gs://*)
      gsutil cp "$BACKUP_FILE" "${BACKUP_BUCKET%/}/"
      ;;
    s3://*)
      aws s3 cp "$BACKUP_FILE" "${BACKUP_BUCKET%/}/"
      ;;
    *)
      echo "Unsupported BACKUP_BUCKET scheme. Use gs:// or s3://." >&2
      exit 2
      ;;
  esac
fi

echo "$BACKUP_FILE"
