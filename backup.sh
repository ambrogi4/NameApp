#!/bin/bash
# NameApp Database Backup Script
# Work DB → Azure Blob Storage
# Charity DB → GCP Cloud Storage

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATE=$(date +%Y-%m-%d_%H%M)
LOG_FILE="$SCRIPT_DIR/backup.log"
TMP_DIR="/tmp/nameapp_backups"

# Tools
GSUTIL="$SCRIPT_DIR/google-cloud-sdk/bin/gsutil"
GCP_KEY="$SCRIPT_DIR/adept-array-490513-k9-9c7342db6e82.json"

# Load Azure credentials
source "$SCRIPT_DIR/.env.backup"

# GCP bucket
GCP_BUCKET="gs://nameapp-charity-backups-2026"

# Azure container
AZURE_CONTAINER="work-db-backups"

mkdir -p "$TMP_DIR"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

cleanup() {
    rm -f "$TMP_DIR"/*.sql.gz
}
trap cleanup EXIT

log "=== Backup started ==="

# --- Work DB → Azure ---
WORK_FILE="$TMP_DIR/nameapp_work_$DATE.sql.gz"
log "Dumping Work DB..."
if docker exec nameapp_db_work_1 pg_dump -U user nameapp | gzip > "$WORK_FILE"; then
    WORK_SIZE=$(du -h "$WORK_FILE" | cut -f1)
    log "Work dump complete ($WORK_SIZE)"
else
    log "ERROR: Work DB dump failed"
    exit 1
fi

log "Uploading Work DB to Azure..."
if az storage blob upload \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --account-key "$AZURE_STORAGE_KEY" \
    --container-name "$AZURE_CONTAINER" \
    --name "nameapp_work_$DATE.sql.gz" \
    --file "$WORK_FILE" \
    --output none 2>&1; then
    log "Work DB uploaded to Azure"
else
    log "ERROR: Azure upload failed"
    exit 1
fi

# --- Charity DB → GCP ---
CHARITY_FILE="$TMP_DIR/nameapp_charity_$DATE.sql.gz"
log "Dumping Charity DB..."
if docker exec nameapp_db_charity_1 pg_dump -U user nameapp_charity | gzip > "$CHARITY_FILE"; then
    CHARITY_SIZE=$(du -h "$CHARITY_FILE" | cut -f1)
    log "Charity dump complete ($CHARITY_SIZE)"
else
    log "ERROR: Charity DB dump failed"
    exit 1
fi

log "Uploading Charity DB to GCP..."
export GOOGLE_APPLICATION_CREDENTIALS="$GCP_KEY"
if "$GSUTIL" cp "$CHARITY_FILE" "$GCP_BUCKET/nameapp_charity_$DATE.sql.gz" 2>&1; then
    log "Charity DB uploaded to GCP"
else
    log "ERROR: GCP upload failed"
    exit 1
fi

log "=== Backup completed successfully ==="
