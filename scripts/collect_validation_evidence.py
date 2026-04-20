from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


DEFAULT_HEALTH_URL = "http://127.0.0.1:4116/health"
DEFAULT_TASKS_URL = "http://127.0.0.1:4116/api/tasks"


def run_git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def fetch_json(url: str) -> dict[str, object] | list[dict[str, object]] | None:
    try:
        with urlopen(url, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None


def collect_log_excerpt(log_path: Path, task_id: str, limit: int = 20) -> list[str]:
    if not log_path.exists():
        return []
    lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    interesting = [
        line
        for line in lines
        if task_id in line
        or "OpenCode review gate" in line
        or "Review rejeitou" in line
        or "Review iniciado" in line
    ]
    return interesting[-limit:]


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect local Nexus validation evidence.")
    parser.add_argument("--task", default="GH-6", help="Task identifier to filter in logs/tasks.")
    parser.add_argument(
        "--output",
        default="ops/evidence/validation-evidence.json",
        help="Where to write the JSON artifact.",
    )
    parser.add_argument("--health-url", default=DEFAULT_HEALTH_URL)
    parser.add_argument("--tasks-url", default=DEFAULT_TASKS_URL)
    parser.add_argument(
        "--log-path",
        default=os.getenv(
            "NEXUS_LOG_PATH",
            "/mnt/c/SITES/gemini/NexusOrchestrator/.runtime/local-project/tothemoontokens-local/nexus.log",
        ),
    )
    parser.add_argument("--ci-url", default=os.getenv("CI_PIPELINE_URL") or os.getenv("GITHUB_RUN_URL"))
    parser.add_argument("--review-url", default=os.getenv("PR_URL"))
    parser.add_argument(
        "--checks",
        nargs="*",
        default=[],
        help="Optional free-form list of material checks that were executed locally.",
    )
    args = parser.parse_args()

    health = fetch_json(args.health_url)
    tasks = fetch_json(args.tasks_url)
    task_snapshot = None
    if isinstance(tasks, list):
        task_snapshot = next((task for task in tasks if task.get("id") == args.task), None)

    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "task": args.task,
        "git": {
            "branch": run_git("rev-parse", "--abbrev-ref", "HEAD"),
            "commit": run_git("rev-parse", "HEAD"),
            "dirty": bool(run_git("status", "--short")),
        },
        "ci": {
            "url": args.ci_url,
            "provider": "local_or_env",
        },
        "review": {
            "url": args.review_url,
            "opencode_gate": health.get("opencodeReviewGate") if isinstance(health, dict) else None,
            "validator": health.get("opencodeValidator") if isinstance(health, dict) else None,
        },
        "runtime": {
            "health": health,
            "task_snapshot": task_snapshot,
        },
        "checks": args.checks,
        "log_excerpt": collect_log_excerpt(Path(args.log_path), args.task),
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
