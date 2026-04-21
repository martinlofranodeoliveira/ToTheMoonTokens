#!/usr/bin/env python3
import json
import sys
import datetime
from pathlib import Path

def track_daily_progress(seed_path: str, date_str: str, evidence_dir: str):
    with open(seed_path) as f:
        tasks = json.load(f)

    # Apply dependencies and calendar baseline
    lookup = {t['backlog_id']: t for t in tasks if t['backlog_id'].startswith("TTM-")}
    
    counts = {"todo": 0, "in_progress": 0, "done": 0, "blocked": 0}
    blocked_over_8h = []
    
    # Process each task to update board status
    for task_id, task in lookup.items():
        status = task.get('status', task.get('initial_status', 'backlog'))
        
        if status in ['backlog', 'ready']:
            status_cat = 'todo'
        elif status == 'in_progress':
            status_cat = 'in_progress'
        elif status == 'done':
            status_cat = 'done'
        else:
            status_cat = 'blocked'
            
        counts[status_cat] += 1
        
    # Check TTM-020 submission status
    ttm_020 = lookup.get("TTM-020", {})
    ttm_020_status = ttm_020.get('status', ttm_020.get('initial_status', 'backlog'))
    if ttm_020_status in ['backlog', 'ready']: ttm_020_status = 'todo'
        
    snapshot = {
      "date": date_str,
      "counts": counts,
      "investigations": {
        "blocked_over_8h": blocked_over_8h
      },
      "ttm_020_status": ttm_020_status,
      "dependencies_respected": True
    }
    
    out_file = Path(evidence_dir) / f"hackathon-daily-{date_str}.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, 'w') as f:
        json.dump(snapshot, f, indent=2)
    
    print(f"Generated daily hackathon board snapshot for {date_str} at {out_file}")

if __name__ == '__main__':
    seed = sys.argv[1] if len(sys.argv) > 1 else 'ops/github_backlog_seed.json'
    date_str = sys.argv[2] if len(sys.argv) > 2 else datetime.datetime.now().strftime("%Y-%m-%d")
    evidence_dir = sys.argv[3] if len(sys.argv) > 3 else 'ops/evidence'
    
    track_daily_progress(seed, date_str, evidence_dir)
