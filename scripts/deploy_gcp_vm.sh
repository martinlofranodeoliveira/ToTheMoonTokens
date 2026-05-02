#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_id="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-${CLOUDSDK_CORE_PROJECT:-}}}"
vm_name="${GCP_VM_NAME:-}"
vm_zone="${GCP_VM_ZONE:-}"
deploy_root="${TTM_DEPLOY_ROOT:-/opt/tothemoontokens}"
public_host="${PUBLIC_HOST:-}"
release_id="${TTM_RELEASE_ID:-$(date -u +%Y%m%d%H%M%S)-$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || echo manual)}"
archive="$(mktemp -t ttm-release.XXXXXX.tar.gz)"
env_file="$(mktemp -t ttm-env.XXXXXX)"
remote_archive="/tmp/tothemoontokens-${release_id}.tar.gz"
remote_env="/tmp/tothemoontokens-${release_id}.env"

cleanup() {
  rm -f "$archive" "$env_file"
}
trap cleanup EXIT

require() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 2
  fi
}

require GCP_PROJECT_ID "$project_id"
require GCP_VM_NAME "$vm_name"
require GCP_VM_ZONE "$vm_zone"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required for VM deployment." >&2
  exit 2
fi

if [[ -n "${TTM_ENV_FILE:-}" ]]; then
  cp "$TTM_ENV_FILE" "$env_file"
elif [[ -f "$repo_root/.env.deploy" ]]; then
  cp "$repo_root/.env.deploy" "$env_file"
elif [[ -f "$repo_root/.env" ]]; then
  cp "$repo_root/.env" "$env_file"
else
  echo "No env file found. Set TTM_ENV_FILE, create .env.deploy, or create .env." >&2
  exit 2
fi

if [[ -n "$public_host" ]] && ! grep -q '^PUBLIC_HOST=' "$env_file"; then
  printf '\nPUBLIC_HOST=%s\n' "$public_host" >> "$env_file"
fi

required_env_keys=(
  APP_ENV
  DATABASE_URL
  JWT_SECRET
  POSTGRES_PASSWORD
  STRIPE_WEBHOOK_SECRET
)
for key in "${required_env_keys[@]}"; do
  if ! grep -Eq "^${key}=" "$env_file"; then
    echo "Deploy env file is missing required key: $key" >&2
    exit 2
  fi
done

(
  cd "$repo_root"
  tar \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.env.deploy' \
    --exclude='.venv' \
    --exclude='apps/web-next/node_modules' \
    --exclude='apps/web-next/dist' \
    --exclude='node_modules' \
    --exclude='**/__pycache__' \
    -czf "$archive" .
)

gcloud config set project "$project_id" >/dev/null

gcloud compute ssh "$vm_name" --zone "$vm_zone" --project "$project_id" --command "sudo mkdir -p '$deploy_root/releases' '$deploy_root/shared' && sudo chown -R \$(id -u):\$(id -g) '$deploy_root'"
gcloud compute scp --zone "$vm_zone" --project "$project_id" "$archive" "$vm_name:$remote_archive"
gcloud compute scp --zone "$vm_zone" --project "$project_id" "$env_file" "$vm_name:$remote_env"

gcloud compute ssh "$vm_name" --zone "$vm_zone" --project "$project_id" --command "TTM_DEPLOY_ROOT='$deploy_root' TTM_RELEASE_ID='$release_id' TTM_REMOTE_ARCHIVE='$remote_archive' TTM_REMOTE_ENV='$remote_env' bash -s" <<'REMOTE'
set -euo pipefail

deploy_root="${TTM_DEPLOY_ROOT:?}"
release_id="${TTM_RELEASE_ID:?}"
remote_archive="${TTM_REMOTE_ARCHIVE:?}"
remote_env="${TTM_REMOTE_ENV:?}"
release_dir="$deploy_root/releases/$release_id"
previous_target=""
if [[ -L "$deploy_root/current" ]]; then
  previous_target="$(readlink -f "$deploy_root/current")"
fi

mkdir -p "$release_dir" "$deploy_root/shared"
tar -xzf "$remote_archive" -C "$release_dir"
install -m 0600 "$remote_env" "$deploy_root/shared/.env"
ln -sfn "$release_dir" "$deploy_root/current"
cp "$deploy_root/shared/.env" "$release_dir/.env"
cd "$release_dir"

docker compose -f docker-compose.vm.yml config >/dev/null
if ! docker compose -p tothemoontokens -f docker-compose.vm.yml up -d --build --remove-orphans; then
  echo "Deploy failed; attempting rollback." >&2
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    ln -sfn "$previous_target" "$deploy_root/current"
    cp "$deploy_root/shared/.env" "$previous_target/.env"
    cd "$previous_target"
    docker compose -p tothemoontokens -f docker-compose.vm.yml up -d --build --remove-orphans || true
  fi
  exit 1
fi

if ! docker compose -p tothemoontokens -f docker-compose.vm.yml exec -T api alembic upgrade head; then
  echo "Database migration failed; attempting rollback." >&2
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    ln -sfn "$previous_target" "$deploy_root/current"
    cp "$deploy_root/shared/.env" "$previous_target/.env"
    cd "$previous_target"
    docker compose -p tothemoontokens -f docker-compose.vm.yml up -d --build --remove-orphans || true
  fi
  exit 1
fi

for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1/health >/dev/null; then
    docker compose -p tothemoontokens -f docker-compose.vm.yml ps
    rm -f "$remote_archive" "$remote_env"
    exit 0
  fi
  sleep 2
done

echo "Health check failed; attempting rollback." >&2
if [[ -n "$previous_target" && -d "$previous_target" ]]; then
  ln -sfn "$previous_target" "$deploy_root/current"
  cp "$deploy_root/shared/.env" "$previous_target/.env"
  cd "$previous_target"
  docker compose -p tothemoontokens -f docker-compose.vm.yml up -d --build --remove-orphans || true
fi
exit 1
REMOTE
