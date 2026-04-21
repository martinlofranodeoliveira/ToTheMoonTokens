#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

GITHUB_REMOTE="${GITHUB_REMOTE_NAME:-origin}"
GITLAB_REMOTE="${GITLAB_REMOTE_NAME:-gitlab}"
ARTIFACT_PATH="${MIRROR_EVIDENCE_PATH:-$ROOT_DIR/ops/evidence/mirror-verification.json}"

if ! git remote get-url "$GITHUB_REMOTE" >/dev/null 2>&1; then
  echo "Missing GitHub remote: $GITHUB_REMOTE" >&2
  exit 2
fi

if ! git remote get-url "$GITLAB_REMOTE" >/dev/null 2>&1; then
  echo "Missing GitLab remote: $GITLAB_REMOTE" >&2
  exit 2
fi

declare -a branches=()
if [ "$#" -gt 0 ]; then
  branches=("$@")
else
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  branches=("main")
  if [ "$current_branch" != "HEAD" ] && [ "$current_branch" != "main" ]; then
    branches+=("$current_branch")
  fi
fi

python3 - "$GITHUB_REMOTE" "$GITLAB_REMOTE" "$ARTIFACT_PATH" "${branches[@]}" <<'PY'
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, UTC
from pathlib import Path
from urllib.parse import quote


github_remote = sys.argv[1]
gitlab_remote = sys.argv[2]
artifact_path = Path(sys.argv[3])
branches = list(dict.fromkeys(sys.argv[4:]))
gitlab_token = os.getenv("GITLAB_TOKEN", "")
github_token = os.getenv("GITHUB_TOKEN", "")


def remote_url(name: str) -> str:
    return subprocess.check_output(
        ["git", "remote", "get-url", name],
        text=True,
    ).strip()


def authenticated_target(remote: str, url: str) -> str:
    if remote == gitlab_remote and url.startswith("https://") and gitlab_token:
        encoded = quote(gitlab_token, safe="")
        return url.replace("https://", f"https://oauth2:{encoded}@")
    if remote == github_remote and url.startswith("https://") and github_token:
        encoded = quote(github_token, safe="")
        return url.replace("https://", f"https://x-access-token:{encoded}@")
    return remote


def head_sha(remote: str, branch: str) -> tuple[str | None, str | None]:
    url = remote_url(remote)
    result = subprocess.run(
        ["git", "ls-remote", "--heads", authenticated_target(remote, url), branch],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return None, result.stderr.strip() or f"git ls-remote failed for {remote}:{branch}"
    line = result.stdout.strip()
    if not line:
        return None, None
    return line.split()[0], None


rows: list[dict[str, object]] = []
has_failure = False

for branch in branches:
    github_sha, github_error = head_sha(github_remote, branch)
    gitlab_sha, gitlab_error = head_sha(gitlab_remote, branch)

    if github_error or gitlab_error:
        status = "error"
        has_failure = True
    elif not github_sha or not gitlab_sha:
        status = "missing"
        has_failure = True
    elif github_sha != gitlab_sha:
        status = "mismatch"
        has_failure = True
    else:
        status = "matched"

    rows.append(
        {
            "branch": branch,
            "status": status,
            "github_sha": github_sha,
            "gitlab_sha": gitlab_sha,
            "github_error": github_error,
            "gitlab_error": gitlab_error,
        }
    )

payload = {
    "generated_at": datetime.now(UTC).isoformat(),
    "github_remote": {"name": github_remote, "url": remote_url(github_remote)},
    "gitlab_remote": {"name": gitlab_remote, "url": remote_url(gitlab_remote)},
    "branches": rows,
    "ok": not has_failure,
}

artifact_path.parent.mkdir(parents=True, exist_ok=True)
artifact_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

print(json.dumps(payload, indent=2))
sys.exit(1 if has_failure else 0)
PY
