from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

ArcJobStatus = Literal["pending", "escrowed", "completed", "disputed"]


class NexusTaskEvent(BaseModel):
    task_id: str
    agent_id: str
    action: str
    evidence: dict[str, str] = Field(default_factory=dict)


class ArcJobProof(BaseModel):
    job_id: str
    task_id: str
    agent_id: str
    status: ArcJobStatus
    proof_hash: str
    timestamp: datetime
    metadata: dict[str, str]


def _jobs_path() -> Path:
    configured = os.getenv("ARC_JOBS_FILE", ".nexus/arc_jobs.json")
    return Path(configured)


def _load_jobs() -> list[ArcJobProof]:
    path = _jobs_path()
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return [ArcJobProof.model_validate(item) for item in payload]
    except Exception:
        return []


def _persist(jobs: list[ArcJobProof]) -> None:
    path = _jobs_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.parent / f".{path.name}.tmp"
    tmp_path.write_text(
        json.dumps([job.model_dump(mode="json") for job in jobs], indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)


def generate_proof_hash(event: NexusTaskEvent) -> str:
    payload = f"{event.task_id}-{event.agent_id}-{event.action}-{time.time()}"
    return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def submit_nexus_task_event(event: NexusTaskEvent) -> ArcJobProof:
    jobs = _load_jobs()
    job_id = f"job_arc_{len(jobs) + 1}_{int(time.time())}"
    proof_hash = generate_proof_hash(event)

    proof = ArcJobProof(
        job_id=job_id,
        task_id=event.task_id,
        agent_id=event.agent_id,
        status="completed" if event.action == "complete" else "pending",
        proof_hash=proof_hash,
        timestamp=datetime.now(UTC),
        metadata={
            "action": event.action,
            "evidence_keys": ",".join(event.evidence.keys()),
            "adapter_version": "1.0",
            "chain": "stubbed-testnet",
        },
    )
    jobs.append(proof)
    _persist(jobs)
    return proof


def get_arc_jobs(limit: int = 20) -> list[ArcJobProof]:
    jobs = _load_jobs()
    return sorted(jobs, key=lambda x: x.timestamp, reverse=True)[:limit]
