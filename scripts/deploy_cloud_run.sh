#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="${GCLOUD_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCLOUD_REGION:-us-central1}"

API_SERVICE="${API_SERVICE:-ttm-api}"
WEB_SERVICE="${WEB_SERVICE:-ttm-web}"
PITCH_SERVICE="${PITCH_SERVICE:-ttm-pitch}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "GCLOUD_PROJECT_ID is required or an active gcloud project must be configured." >&2
  exit 1
fi

required_apis=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
)

enabled_apis="$(gcloud services list \
  --enabled \
  --project "${PROJECT_ID}" \
  --format='value(config.name)')"

missing_apis=()
for api in "${required_apis[@]}"; do
  if ! grep -qx "${api}" <<<"${enabled_apis}"; then
    missing_apis+=("${api}")
  fi
done

if (( ${#missing_apis[@]} > 0 )); then
  gcloud services enable "${missing_apis[@]}" \
    --project "${PROJECT_ID}" \
    --quiet
fi

gcloud run deploy "${API_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${REPO_ROOT}/services/api" \
  --allow-unauthenticated \
  --port 8010 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 2 \
  --set-env-vars "^@^APP_ENV=production@API_HOST=0.0.0.0@API_PORT=8010@LOG_LEVEL=INFO@ENABLE_LIVE_TRADING=false@ALLOW_MAINNET_TRADING=false@CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173@ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network@MARKETPLACE_SETTLEMENT_TIMEOUT_S=3@CIRCLE_BOOTSTRAP_ON_STARTUP=false@PAPER_JOURNAL_FILE=/tmp/paper_journal.json@ARC_JOBS_FILE=/tmp/arc_jobs.json" \
  --quiet

API_URL="$(gcloud run services describe "${API_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)')"

gcloud run deploy "${WEB_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${REPO_ROOT}/apps/web" \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 2 \
  --set-env-vars "TTM_API_BASE_URL=${API_URL}" \
  --quiet

WEB_URL="$(gcloud run services describe "${WEB_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)')"

gcloud run deploy "${PITCH_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${REPO_ROOT}/apps/pitch" \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 2 \
  --quiet

PITCH_URL="$(gcloud run services describe "${PITCH_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)')"

gcloud run services update "${API_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --update-env-vars "^@^CORS_ALLOWED_ORIGINS=${WEB_URL},${PITCH_URL},http://127.0.0.1:4173,http://localhost:4173" \
  --quiet

printf 'API_URL=%s\n' "${API_URL}"
printf 'WEB_URL=%s\n' "${WEB_URL}"
printf 'PITCH_URL=%s\n' "${PITCH_URL}"
printf 'APPLICATION_URL=%s\n' "${WEB_URL}"
