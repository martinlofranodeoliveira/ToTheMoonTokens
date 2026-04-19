#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEED_FILE = ROOT / "ops" / "github_backlog_seed.json"


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
      raise SystemExit(f"Missing required environment variable: {name}")
    return value


def github_request(method: str, url: str, token: str, payload: dict | None = None):
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ToTheMoonTokens-BacklogSeeder",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def list_open_issues(owner: str, repo: str, token: str) -> list[dict]:
    query = urllib.parse.urlencode({"state": "open", "per_page": 100})
    url = f"https://api.github.com/repos/{owner}/{repo}/issues?{query}"
    issues = github_request("GET", url, token)
    return [issue for issue in issues if "pull_request" not in issue]


def render_issue_body(item: dict) -> str:
    def lines_for(values: list[str]) -> str:
        if not values:
            return "- none"
        return "\n".join(f"- {value}" for value in values)

    return f"""## Backlog ID
{item["backlog_id"]}

## Objective
{item["objective"]}

## Initial Nexus Status
{item["initial_status"]}

## Priority
{item["priority"]}

## Phase
{item["phase"]}

## Suggested Squad
{item["suggested_squad"]}

## Approved Scope
{lines_for(item.get("approved_scope", []))}

## Acceptance Criteria
{lines_for(item.get("acceptance_criteria", []))}

## Dependencies
{lines_for(item.get("dependencies", []))}

## Known External Access Gaps
{lines_for(item.get("external_access_gaps", []))}

## Explicitly Out of Scope For This Issue
{lines_for(item.get("out_of_scope", []))}

## Agent Execution Rules
{lines_for(item.get("execution_rules", []))}
""".strip() + "\n"


def backlog_id_from_issue(issue: dict) -> str | None:
    title = str(issue.get("title", "")).strip()
    if not title:
        return None
    first_token = title.split(" ", 1)[0].strip().upper()
    if first_token.startswith("TTM-"):
        return first_token
    return None


def load_seed(seed_path: Path) -> list[dict]:
    return json.loads(seed_path.read_text(encoding="utf-8"))


def main() -> int:
    token = require_env("GITHUB_TOKEN")
    owner = require_env("GITHUB_OWNER")
    repo = require_env("GITHUB_REPO")
    seed_path = Path(os.environ.get("TTM_BACKLOG_SEED_FILE", str(DEFAULT_SEED_FILE))).resolve()

    items = load_seed(seed_path)
    existing_issues = list_open_issues(owner, repo, token)
    existing_by_backlog = {
        backlog_id_from_issue(issue): issue
        for issue in existing_issues
        if backlog_id_from_issue(issue)
    }

    created = 0
    updated = 0

    for item in items:
        backlog_id = str(item["backlog_id"]).strip().upper()
        title = str(item["title"]).strip()
        body = render_issue_body(item)
        current = existing_by_backlog.get(backlog_id)

        if current is None:
            payload = {"title": title, "body": body}
            url = f"https://api.github.com/repos/{owner}/{repo}/issues"
            github_request("POST", url, token, payload)
            created += 1
            print(f"created {backlog_id}")
            continue

        current_title = str(current.get("title", "")).strip()
        current_body = str(current.get("body", ""))
        if current_title == title and current_body == body:
            print(f"unchanged {backlog_id}")
            continue

        payload = {"title": title, "body": body}
        url = f"https://api.github.com/repos/{owner}/{repo}/issues/{current['number']}"
        github_request("PATCH", url, token, payload)
        updated += 1
        print(f"updated {backlog_id}")

    print(f"done created={created} updated={updated}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"GitHub API error: HTTP {error.code}: {detail}") from error
