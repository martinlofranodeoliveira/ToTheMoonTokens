import json
import sys
from pathlib import Path

# Add scripts directory to path to import sync_github_backlog
scripts_dir = Path(__file__).resolve().parent.parent.parent.parent / "scripts"
sys.path.append(str(scripts_dir))

import sync_github_backlog

def test_backlog_id_from_issue():
    assert sync_github_backlog.backlog_id_from_issue({"title": "TTM-001 [P0] Something"}) == "TTM-001"
    assert sync_github_backlog.backlog_id_from_issue({"title": "ttm-002: lowercase"}) == "TTM-002:"
    assert sync_github_backlog.backlog_id_from_issue({"title": "No backlog id"}) is None
    assert sync_github_backlog.backlog_id_from_issue({}) is None
    assert sync_github_backlog.backlog_id_from_issue({"title": ""}) is None

def test_render_issue_body():
    item = {
        "backlog_id": "TTM-001",
        "objective": "Test objective",
        "initial_status": "ready",
        "priority": "P0",
        "phase": "Phase 1",
        "suggested_squad": "qa",
        "approved_scope": ["Scope 1"],
    }
    body = sync_github_backlog.render_issue_body(item)
    assert "## Backlog ID\nTTM-001" in body
    assert "## Objective\nTest objective" in body
    assert "## Approved Scope\n- Scope 1" in body
    assert "## Dependencies\n- none" in body

