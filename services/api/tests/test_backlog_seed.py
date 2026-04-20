import json
from pathlib import Path

def test_github_backlog_seed_is_valid():
    seed_file = Path(__file__).resolve().parent.parent.parent.parent / "ops" / "github_backlog_seed.json"
    assert seed_file.exists(), f"github_backlog_seed.json must exist at {seed_file}"
    
    with open(seed_file, "r") as f:
        data = json.load(f)
        
    assert isinstance(data, list), "Seed must be a list of issues"
    assert len(data) > 0, "Seed must not be empty"
    
    for item in data:
        assert "backlog_id" in item, "Item must have backlog_id"
        assert "title" in item, "Item must have title"
        assert "objective" in item, "Item must have objective"
        assert "priority" in item, "Item must have priority"
        
        # Test required arrays
        for list_key in ["approved_scope", "acceptance_criteria", "dependencies", "external_access_gaps", "out_of_scope", "execution_rules"]:
            if list_key in item:
                assert isinstance(item[list_key], list), f"{list_key} must be a list in {item['backlog_id']}"
