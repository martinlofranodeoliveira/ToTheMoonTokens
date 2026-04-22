from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

JobState = Literal[
    "REQUESTED",
    "PAYMENT_UNLOCKED",
    "WORK_RESERVED",
    "REVIEW_PENDING",
    "DELIVERED",
]


class JobTransition(BaseModel):
    from_state: JobState | None
    to_state: JobState
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reason: str


class NexusJobCreateRequest(BaseModel):
    id: str
    description: str = "Nexus job"


class NexusJob(BaseModel):
    id: str
    state: JobState = "REQUESTED"
    transitions: list[JobTransition] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    description: str = "Nexus job"

    def transition_to(self, new_state: JobState, reason: str) -> None:
        self.transitions.append(
            JobTransition(
                from_state=self.state,
                to_state=new_state,
                reason=reason,
            )
        )
        self.state = new_state


_jobs: dict[str, NexusJob] = {}

_VALID_TRANSITIONS: dict[JobState, JobState | None] = {
    "PAYMENT_UNLOCKED": "REQUESTED",
    "WORK_RESERVED": "PAYMENT_UNLOCKED",
    "REVIEW_PENDING": "WORK_RESERVED",
    "DELIVERED": "REVIEW_PENDING",
}


def clear_jobs() -> None:
    _jobs.clear()


def create_job(job_id: str, description: str) -> NexusJob:
    if job_id in _jobs:
        raise ValueError(f"Job {job_id} already exists")
    job = NexusJob(id=job_id, description=description)
    job.transitions.append(
        JobTransition(
            from_state=None,
            to_state="REQUESTED",
            reason="Job requested",
        )
    )
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> NexusJob | None:
    return _jobs.get(job_id)


def list_jobs() -> list[NexusJob]:
    return sorted(_jobs.values(), key=lambda job: job.created_at)


def transition_job(job_id: str, new_state: JobState, reason: str) -> NexusJob | None:
    job = get_job(job_id)
    if job is None:
        return None
    expected_current = _VALID_TRANSITIONS[new_state]
    if expected_current != job.state:
        return None
    job.transition_to(new_state, reason)
    return job


def unlock_payment(job_id: str) -> NexusJob | None:
    return transition_job(job_id, "PAYMENT_UNLOCKED", "Payment confirmed")


def reserve_work(job_id: str) -> NexusJob | None:
    return transition_job(job_id, "WORK_RESERVED", "Nexus work allocated")


def request_review(job_id: str) -> NexusJob | None:
    return transition_job(job_id, "REVIEW_PENDING", "Work completed, awaiting review")


def deliver_job(job_id: str) -> NexusJob | None:
    return transition_job(job_id, "DELIVERED", "Review passed, delivery unlocked")


def _require_transition(job: NexusJob | None, job_id: str, target: str) -> NexusJob:
    if job is None:
        if get_job(job_id) is None:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        raise HTTPException(status_code=409, detail=f"Cannot transition job {job_id} to {target}")
    return job


@router.get("", response_model=list[NexusJob])
def list_jobs_endpoint():
    return list_jobs()


@router.delete("")
def clear_jobs_endpoint():
    clear_jobs()
    return {"ok": True}


@router.post("", response_model=NexusJob)
def create_job_endpoint(request: NexusJobCreateRequest):
    try:
        return create_job(request.id, request.description)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/{job_id}", response_model=NexusJob)
def get_job_endpoint(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.post("/{job_id}/unlock_payment", response_model=NexusJob)
def unlock_payment_endpoint(job_id: str):
    return _require_transition(unlock_payment(job_id), job_id, "PAYMENT_UNLOCKED")


@router.post("/{job_id}/reserve_work", response_model=NexusJob)
def reserve_work_endpoint(job_id: str):
    return _require_transition(reserve_work(job_id), job_id, "WORK_RESERVED")


@router.post("/{job_id}/request_review", response_model=NexusJob)
def request_review_endpoint(job_id: str):
    return _require_transition(request_review(job_id), job_id, "REVIEW_PENDING")


@router.post("/{job_id}/deliver", response_model=NexusJob)
def deliver_job_endpoint(job_id: str):
    return _require_transition(deliver_job(job_id), job_id, "DELIVERED")
