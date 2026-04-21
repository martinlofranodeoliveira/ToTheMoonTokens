import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .observability import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/demo/jobs", tags=["demo"])

class JobRequest(BaseModel):
    artifact_type: str = Field(default="scalp_validation")

class DemoJob(BaseModel):
    id: str
    artifact_type: str
    state: Literal["REQUESTED", "PAID", "EXECUTING", "REVIEW_PENDING", "REVIEWED", "DELIVERED"]
    price_usdc: float

_jobs: dict[str, DemoJob] = {}

@router.post("/request", response_model=DemoJob)
def request_job(req: JobRequest):
    job_id = uuid.uuid4().hex[:8]
    job = DemoJob(
        id=job_id,
        artifact_type=req.artifact_type,
        state="REQUESTED",
        price_usdc=5.0
    )
    _jobs[job_id] = job
    log.info("audit_event", event_type="request", job_id=job_id, artifact=req.artifact_type, state=job.state)
    return job

@router.post("/{job_id}/pay", response_model=DemoJob)
def pay_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != "REQUESTED":
        raise HTTPException(400, f"Cannot pay for job in state {job.state}")
    
    job.state = "PAID"
    log.info("audit_event", event_type="payment", job_id=job_id, state=job.state, amount=job.price_usdc)
    return job

@router.post("/{job_id}/execute", response_model=DemoJob)
def execute_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != "PAID":
        raise HTTPException(400, f"Cannot execute job in state {job.state}. Payment required.")
    
    job.state = "REVIEW_PENDING"
    log.info("audit_event", event_type="execution", job_id=job_id, state=job.state)
    return job

@router.post("/{job_id}/review", response_model=DemoJob)
def review_job(job_id: str, approve: bool = True):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != "REVIEW_PENDING":
        raise HTTPException(400, f"Cannot review job in state {job.state}")
    
    if approve:
        job.state = "REVIEWED"
        log.info("audit_event", event_type="review", job_id=job_id, state=job.state, decision="approved")
    else:
        job.state = "EXECUTING" # Needs rework
        log.info("audit_event", event_type="review", job_id=job_id, state=job.state, decision="rejected")
    return job

@router.post("/{job_id}/deliver", response_model=DemoJob)
def deliver_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != "REVIEWED":
        raise HTTPException(400, f"Cannot deliver job in state {job.state}. Review required.")
    
    job.state = "DELIVERED"
    log.info("audit_event", event_type="delivery", job_id=job_id, state=job.state)
    return job
