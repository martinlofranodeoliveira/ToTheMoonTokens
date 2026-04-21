from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field

from .models import ArcJob, ArcProof, ArcJobStatus

logger = logging.getLogger(__name__)


class ArcJobRequest(BaseModel):
    nexus_task_id: str
    job_type: str = "research_backtest"
    agent_id: str = "nexus_agent_1"
    parameters: dict = Field(default_factory=dict)
    reward_amount: float = 0.0


def _arc_store_path() -> Path:
    configured = os.getenv("ARC_STORE_FILE", ".nexus/arc_jobs.json")
    return Path(configured)


def _load_raw() -> list[dict]:
    path = _arc_store_path()
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def _persist(records: list[ArcJob]) -> None:
    path = _arc_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.parent / f".{path.name}.tmp"
    tmp_path.write_text(
        json.dumps([r.model_dump(mode="json") for r in records], indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)


def load_jobs() -> list[ArcJob]:
    jobs = []
    for payload in _load_raw():
        try:
            jobs.append(ArcJob.model_validate(payload))
        except Exception:
            continue
    return jobs


def submit_job(request: ArcJobRequest) -> ArcJob:
    jobs = load_jobs()
    job_id = f"arc_job_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    job = ArcJob(
        id=job_id,
        nexus_task_id=request.nexus_task_id,
        status="pending",
        created_at=now,
        updated_at=now,
        reward_amount=request.reward_amount,
    )
    jobs.append(job)
    _persist(jobs)
    logger.info(f"Submitted Arc job {job_id} for Nexus task {request.nexus_task_id}")
    return job


def complete_job_with_proof(job_id: str, evidence: dict) -> ArcJob:
    jobs = load_jobs()
    job = next((j for j in jobs if j.id == job_id), None)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    now = datetime.now(timezone.utc)
    proof = ArcProof(
        proof_id=f"proof_{uuid.uuid4().hex[:16]}",
        job_id=job_id,
        agent_id="nexus_agent_1",
        timestamp=now,
        evidence_payload=evidence,
        transaction_hash=f"0x_stub_{uuid.uuid4().hex}",
    )

    job.status = "completed"
    job.updated_at = now
    job.proof = proof

    _persist(jobs)
    logger.info(f"Completed Arc job {job_id} with proof {proof.proof_id}")
    return job


def get_job(job_id: str) -> ArcJob | None:
    jobs = load_jobs()
    return next((j for j in jobs if j.id == job_id), None)


def get_all_jobs() -> list[ArcJob]:
    return load_jobs()


def clear_jobs() -> None:
    path = _arc_store_path()
    if path.exists():
        path.unlink()
