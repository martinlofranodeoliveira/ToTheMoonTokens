from tothemoon_api.arc_adapter import NexusTaskEvent, get_arc_jobs, submit_nexus_task_event


def test_submit_nexus_task_event():
    event = NexusTaskEvent(
        task_id="GH-40",
        agent_id="dev",
        action="complete",
        evidence={"commit": "abc", "lines": "100"},
    )
    proof = submit_nexus_task_event(event)
    assert proof.task_id == "GH-40"
    assert proof.agent_id == "dev"
    assert proof.status == "completed"
    assert proof.proof_hash.startswith("0x")
    assert "commit" in proof.metadata["evidence_keys"]

    jobs = get_arc_jobs()
    assert len(jobs) > 0
    assert jobs[0].job_id == proof.job_id
