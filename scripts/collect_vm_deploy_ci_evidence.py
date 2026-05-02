from __future__ import annotations

import json
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path


def run_git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def ci_run_url() -> str | None:
    if os.getenv("GITHUB_ACTIONS"):
        server_url = os.getenv("GITHUB_SERVER_URL")
        repository = os.getenv("GITHUB_REPOSITORY")
        run_id = os.getenv("GITHUB_RUN_ID")
        if server_url and repository and run_id:
            return f"{server_url}/{repository}/actions/runs/{run_id}"
    return os.getenv("CI_PIPELINE_URL")


def ci_provider() -> str:
    if os.getenv("GITHUB_ACTIONS"):
        return "github_actions"
    if os.getenv("GITLAB_CI"):
        return "gitlab_ci"
    return "local"


def deploy_script_runs_migrations() -> bool:
    deploy_script = Path("scripts/deploy_gcp_vm.sh").read_text(encoding="utf-8")
    return "alembic upgrade head" in deploy_script


def main() -> int:
    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "task": "GEN-54",
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
        "vm_deploy": {
            "github_workflow": ".github/workflows/deploy-gcp-vm.yml",
            "gitlab_pipeline": ".gitlab-ci.yml",
            "deploy_script": "scripts/deploy_gcp_vm.sh",
            "compose_file": "docker-compose.vm.yml",
            "runbook": "docs/GCP_VM_DEPLOYMENT.md",
            "required_secret_names": [
                "GCP_PROJECT_ID",
                "GCP_SERVICE_ACCOUNT_JSON",
                "GCP_VM_NAME",
                "GCP_VM_ZONE",
                "GCP_VM_DB_PASSWORD",
                "JWT_SECRET",
                "STRIPE_WEBHOOK_SECRET",
                "GEMINI_API_KEY",
                "PUBLIC_HOST",
                "CORS_ALLOWED_ORIGINS",
            ],
            "safety_defaults": {
                "WALLET_MODE": "manual_only",
                "AUTONOMOUS_PAYMENTS_ENABLED": "false",
                "CIRCLE_BOOTSTRAP_ON_STARTUP": "false",
                "ALLOW_IMPORT_TIME_INIT_DB": "false",
            },
            "migration_step": {
                "command": "alembic upgrade head",
                "present": deploy_script_runs_migrations(),
            },
        },
        "checks": [
            "make api-baseline",
            "make web-next-build",
            "test -f .github/workflows/deploy-gcp-vm.yml",
            "test -f scripts/deploy_gcp_vm.sh",
            "grep -q 'alembic upgrade head' scripts/deploy_gcp_vm.sh",
            "test -f docker-compose.vm.yml",
            "test -f docs/GCP_VM_DEPLOYMENT.md",
        ],
    }
    if not payload["vm_deploy"]["migration_step"]["present"]:
        raise RuntimeError("scripts/deploy_gcp_vm.sh must run `alembic upgrade head`")

    output = Path("ops/evidence/vm-deploy-ci-evidence.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
