from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

JobState = Literal["REQUESTED", "PAYMENT_UNLOCKED", "WORK_RESERVED", "REVIEW_PENDING", "DELIVERED"]

class JobTransition(BaseModel):
    from_state: JobState | None
    to_state: JobState
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reason: str

class NexusJob(BaseModel):
    id: str
    state: JobState = "REQUESTED"
    transitions: list[JobTransition] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    description: str = "Nexus job"
    
    def transition_to(self, new_state: JobState, reason: str):
        self.transitions.append(JobTransition(
            from_state=self.state,
            to_state=new_state,
            reason=reason
        ))
        self.state = new_state

_jobs: dict[str, NexusJob] = {}

def create_job(job_id: str, description: str) -> NexusJob:
    job = NexusJob(id=job_id, description=description)
    job.transitions.append(JobTransition(from_state=None, to_state="REQUESTED", reason="Job requested"))
    _jobs[job_id] = job
    return job

def get_job(job_id: str) -> NexusJob | None:
    return _jobs.get(job_id)

def list_jobs() -> list[NexusJob]:
    return list(_jobs.values())

def unlock_payment(job_id: str) -> NexusJob | None:
    job = get_job(job_id)
    if job and job.state == "REQUESTED":
        job.transition_to("PAYMENT_UNLOCKED", "Payment confirmed")
        return job
    return None

def reserve_work(job_id: str) -> NexusJob | None:
    job = get_job(job_id)
    if job and job.state == "PAYMENT_UNLOCKED":
        job.transition_to("WORK_RESERVED", "Nexus work allocated")
        return job
    return None

def request_review(job_id: str) -> NexusJob | None:
    job = get_job(job_id)
    if job and job.state == "WORK_RESERVED":
        job.transition_to("REVIEW_PENDING", "Work completed, awaiting review")
        return job
    return None

def deliver_job(job_id: str) -> NexusJob | None:
    job = get_job(job_id)
    if job and job.state == "REVIEW_PENDING":
        job.transition_to("DELIVERED", "Review passed, delivery unlocked")
        return job
    return None

def clear_jobs():
    _jobs.clear()
