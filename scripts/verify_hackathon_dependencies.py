#!/usr/bin/env python3
import json
from pathlib import Path
import sys

def verify_hackathon_state(seed_path: str):
    with open(seed_path) as f:
        tasks = json.load(f)

    # Build lookup
    lookup = {t['backlog_id']: t for t in tasks}
    
    # Identify blocked advancement
    errors = []
    for task in tasks:
        if not task['backlog_id'].startswith("TTM-"):
            continue
            
        deps = task.get('dependencies', [])
        status = task.get('status', task.get('initial_status', 'backlog'))
        
        # If task is marked as in_progress or done, check if dependencies are done
        # For simulation, we assume dependencies must be 'done' to start next phase.
        if status in ['in_progress', 'done']:
            for dep_id in deps:
                dep_task = lookup.get(dep_id)
                if not dep_task:
                    continue
                dep_status = dep_task.get('status', dep_task.get('initial_status', 'backlog'))
                if dep_status != 'done':
                    errors.append(f"Blocked phase advancement: {task['backlog_id']} ({status}) depends on {dep_id} ({dep_status})")
                    
    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        # Architecture requirement: bloquear avanco de fases quando dependencias nao estao done
        return False
    
    return True

if __name__ == '__main__':
    seed = sys.argv[1] if len(sys.argv) > 1 else 'ops/github_backlog_seed.json'
    if not verify_hackathon_state(seed):
        print("Dependency constraints violated.")
        sys.exit(1)
    print("Hackathon state validated. Dependencies respected.")
