#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${PROJECT_ROOT}/services/api/.nexus/local-demo"
PYTHON_BIN="${PYTHON:-python3}"
ACTION="${1:-start}"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8010}"
WEB_PORT="${WEB_PORT:-4173}"
PITCH_PORT="${PITCH_PORT:-4174}"

if [[ "${PYTHON_BIN}" == */* ]]; then
  PYTHON_BIN="$(cd "$(dirname "${PYTHON_BIN}")" && pwd)/$(basename "${PYTHON_BIN}")"
fi

mkdir -p "${RUNTIME_DIR}"

pid_file() {
  printf '%s/%s.pid\n' "${RUNTIME_DIR}" "$1"
}

log_file() {
  printf '%s/%s.log\n' "${RUNTIME_DIR}" "$1"
}

is_running() {
  local pidfile="$1"
  if [ ! -f "${pidfile}" ]; then
    return 1
  fi
  local pid
  pid="$(cat "${pidfile}")"
  [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null
}

start_named() {
  local name="$1"
  local command="$2"
  local pidfile
  pidfile="$(pid_file "${name}")"
  local logfile
  logfile="$(log_file "${name}")"

  if is_running "${pidfile}"; then
    echo "[local-demo] ${name} already running (pid $(cat "${pidfile}"))"
    return
  fi

  echo "[local-demo] starting ${name}"
  nohup bash -lc "${command}" >"${logfile}" 2>&1 &
  local pid=$!
  echo "${pid}" >"${pidfile}"
  sleep 1
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "[local-demo] failed to start ${name}; showing log:" >&2
    tail -n 60 "${logfile}" >&2 || true
    rm -f "${pidfile}"
    exit 1
  fi
}

stop_named() {
  local name="$1"
  local pidfile
  pidfile="$(pid_file "${name}")"

  if ! is_running "${pidfile}"; then
    rm -f "${pidfile}"
    echo "[local-demo] ${name} not running"
    return
  fi

  local pid
  pid="$(cat "${pidfile}")"
  echo "[local-demo] stopping ${name} (pid ${pid})"
  kill "${pid}" 2>/dev/null || true
  for _ in $(seq 1 20); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      rm -f "${pidfile}"
      return
    fi
    sleep 0.5
  done
  kill -9 "${pid}" 2>/dev/null || true
  rm -f "${pidfile}"
}

status_named() {
  local name="$1"
  local pidfile
  pidfile="$(pid_file "${name}")"
  local logfile
  logfile="$(log_file "${name}")"
  if is_running "${pidfile}"; then
    echo "[local-demo] ${name}: running (pid $(cat "${pidfile}")) log=${logfile}"
  else
    echo "[local-demo] ${name}: stopped"
  fi
}

case "${ACTION}" in
  start)
    if ! "${PYTHON_BIN}" -c "import uvicorn" >/dev/null 2>&1; then
      cat >&2 <<EOF
[local-demo] Missing Python runtime dependencies for the API.
Run:
  make api-install
or activate the environment that already has uvicorn/FastAPI installed.
EOF
      exit 2
    fi

    start_named "api" "cd '${PROJECT_ROOT}/services/api' && exec '${PYTHON_BIN}' -m uvicorn tothemoon_api.main:app --app-dir src --host '${API_HOST}' --port '${API_PORT}'"
    start_named "web" "cd '${PROJECT_ROOT}' && exec '${PYTHON_BIN}' -m http.server '${WEB_PORT}' --bind '${API_HOST}' --directory apps/web"
    start_named "pitch" "cd '${PROJECT_ROOT}' && exec '${PYTHON_BIN}' -m http.server '${PITCH_PORT}' --bind '${API_HOST}' --directory apps/pitch"
    cat <<EOF
[local-demo] ready
  API docs:   http://${API_HOST}:${API_PORT}/docs
  Web room:   http://${API_HOST}:${WEB_PORT}
  Pitch site: http://${API_HOST}:${PITCH_PORT}
Logs live in: ${RUNTIME_DIR}
EOF
    ;;
  stop)
    stop_named "pitch"
    stop_named "web"
    stop_named "api"
    ;;
  restart)
    "${BASH_SOURCE[0]}" stop
    "${BASH_SOURCE[0]}" start
    ;;
  status)
    status_named "api"
    status_named "web"
    status_named "pitch"
    cat <<EOF
  API docs:   http://${API_HOST}:${API_PORT}/docs
  Web room:   http://${API_HOST}:${WEB_PORT}
  Pitch site: http://${API_HOST}:${PITCH_PORT}
EOF
    ;;
  logs)
    for name in api web pitch; do
      local_log="$(log_file "${name}")"
      echo "===== ${name} ====="
      if [ -f "${local_log}" ]; then
        tail -n 40 "${local_log}"
      else
        echo "(no log yet)"
      fi
    done
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}" >&2
    exit 2
    ;;
esac
