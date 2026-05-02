from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "ops" / "evidence" / "backend-frontend-ci-evidence.json"


@dataclass(frozen=True)
class Check:
    name: str
    command: list[str]
    prerequisites: list[str]


CHECKS = [
    Check(
        name="backend_compile",
        command=["make", "api-compile"],
        prerequisites=["python3", "make"],
    ),
    Check(
        name="backend_lint",
        command=["make", "api-lint-venv"],
        prerequisites=["python3", "make"],
    ),
    Check(
        name="backend_tests",
        command=["make", "api-baseline"],
        prerequisites=["python3", "make"],
    ),
    Check(
        name="frontend_build",
        command=["make", "web-next-build"],
        prerequisites=["node", "npm", "make"],
    ),
]


def ci_provider() -> str:
    if os.getenv("GITHUB_ACTIONS"):
        return "github_actions"
    if os.getenv("GITLAB_CI"):
        return "gitlab_ci"
    return "local"


def ci_run_url() -> str | None:
    if os.getenv("GITHUB_ACTIONS"):
        server_url = os.getenv("GITHUB_SERVER_URL")
        repository = os.getenv("GITHUB_REPOSITORY")
        run_id = os.getenv("GITHUB_RUN_ID")
        if server_url and repository and run_id:
            return f"{server_url}/{repository}/actions/runs/{run_id}"
    return os.getenv("CI_PIPELINE_URL")


def run_git(*args: str) -> str | None:
    try:
        return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def missing_prerequisites(check: Check) -> list[str]:
    return [name for name in check.prerequisites if shutil.which(name) is None]


def tail_output(value: str, max_lines: int = 80) -> str:
    lines = value.splitlines()
    return "\n".join(lines[-max_lines:])


def run_check(check: Check) -> dict[str, object]:
    started_at = datetime.now(UTC)
    missing = missing_prerequisites(check)
    if missing:
        return {
            "name": check.name,
            "command": " ".join(check.command),
            "status": "failed",
            "started_at": started_at.isoformat(),
            "finished_at": datetime.now(UTC).isoformat(),
            "duration_seconds": 0.0,
            "exit_code": 127,
            "message": f"Missing prerequisites: {', '.join(missing)}",
        }

    result = subprocess.run(
        check.command,
        cwd=ROOT,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    finished_at = datetime.now(UTC)
    status = "passed" if result.returncode == 0 else "failed"
    payload: dict[str, object] = {
        "name": check.name,
        "command": " ".join(check.command),
        "status": status,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round((finished_at - started_at).total_seconds(), 3),
        "exit_code": result.returncode,
    }
    if result.stdout:
        payload["output_tail"] = tail_output(result.stdout)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run backend/frontend CI baseline checks and write secret-free evidence."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Evidence JSON output path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checks = [run_check(check) for check in CHECKS]
    overall_status = "passed" if all(check["status"] == "passed" for check in checks) else "failed"
    output = args.output if args.output.is_absolute() else ROOT / args.output
    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "task": "GEN-29",
        "status": overall_status,
        "ci": {
            "provider": ci_provider(),
            "url": ci_run_url(),
            "job": os.getenv("GITHUB_JOB") or os.getenv("CI_JOB_NAME"),
            "ref": os.getenv("GITHUB_REF_NAME") or os.getenv("CI_COMMIT_REF_NAME"),
        },
        "git": {
            "branch": run_git("rev-parse", "--abbrev-ref", "HEAD"),
            "commit": run_git("rev-parse", "HEAD"),
            "dirty": bool(run_git("status", "--short")),
        },
        "checks": checks,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(output.relative_to(ROOT) if output.is_relative_to(ROOT) else output)
    return 0 if overall_status == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
