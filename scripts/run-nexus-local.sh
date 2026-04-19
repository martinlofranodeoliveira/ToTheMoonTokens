#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# NEXUS_ROOT_DIR must point to a working NexusOrchestrator checkout. The
# legacy default (/mnt/c/SITES/gemini/NexusOrchestrator) is still honored for
# backwards compatibility on the maintainer's workstation, but any other
# environment must export NEXUS_ROOT_DIR explicitly or pass it inline.
NEXUS_ROOT_DIR="${NEXUS_ROOT_DIR:-/mnt/c/SITES/gemini/NexusOrchestrator}"
NEXUS_ENV_SOURCE="${NEXUS_ENV_SOURCE:-${NEXUS_ROOT_DIR}/.env}"
NEXUS_PROJECT_ENV_FILE="${NEXUS_PROJECT_ENV_FILE:-${PROJECT_ROOT}/.nexus/nexus-launch.env}"
ACTION="${1:-start}"

if [ ! -d "${NEXUS_ROOT_DIR}" ]; then
  cat >&2 <<EOF
[run-nexus-local] NEXUS_ROOT_DIR does not exist: ${NEXUS_ROOT_DIR}
Set NEXUS_ROOT_DIR to the local NexusOrchestrator checkout, e.g.:
  NEXUS_ROOT_DIR=/path/to/NexusOrchestrator ./scripts/run-nexus-local.sh ${ACTION}
EOF
  exit 2
fi

if [ ! -x "${NEXUS_ROOT_DIR}/run-project-local.sh" ]; then
  echo "[run-nexus-local] Missing runner: ${NEXUS_ROOT_DIR}/run-project-local.sh" >&2
  exit 2
fi

if [ "$#" -gt 0 ]; then
  shift
fi

if [ -f "${NEXUS_ENV_SOURCE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${NEXUS_ENV_SOURCE}"
  set +a
fi

# Preserva segredos do Nexus principal, mas evita que configuracoes de outra instância
# sobrescrevam o profile deste projeto no launcher generico.
unset HOST
unset PORT
unset PROJECT_DIR
unset NEXUS_BOOTSTRAP_DEMO_TASKS
unset NEXUS_USE_GITHUB_BOARD
unset NEXUS_RUNTIME_STATE_DIR_OVERRIDE
unset NEXUS_WORKTREE_ROOT_OVERRIDE
unset NEXUS_AUTO_DISPATCH
unset NEXUS_INSTANCE_ID
unset NEXUS_INSTANCE_OWNER
unset NEXUS_LOCAL_RUN_NAMESPACE
unset NEXUS_DEFAULT_ROOM_TOPOLOGY
unset NEXUS_PRIMARY_ROOM_REPLICAS
unset NEXUS_REVIEW_ROOM_REPLICAS
unset NEXUS_ROLE_ROOM_REPLICAS
unset NEXUS_PHASE_BRANCH_MAP
unset NEXUS_PHASE_TASK_BASE_BRANCH_MAP
unset NEXUS_TASK_BRANCH_BASE
unset NEXUS_LOCAL_PROJECT_BRANCH_BASE_MODE

export NEXUS_ENV_FILE="${NEXUS_PROJECT_ENV_FILE}"
export PROJECT_DIR="${PROJECT_ROOT}"

cd "${NEXUS_ROOT_DIR}"
exec ./run-project-local.sh "${ACTION}" "${PROJECT_ROOT}" "$@"
