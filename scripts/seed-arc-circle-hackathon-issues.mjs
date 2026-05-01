#!/usr/bin/env node

import fs from "node:fs";

const NEXUS_ENV_PATH = "/mnt/c/SITES/gemini/NexusOrchestrator/.env";
const PROJECT_ENV_PATH = "/mnt/c/sites/gemini/ToTheMoonTokens/.nexus/nexus-launch.env";
const BACKLOG_PATH =
  "/mnt/c/sites/gemini/ToTheMoonTokens/ops/arc_circle_hackathon_backlog.json";

function loadEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    return result;
  }

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function normalizeStatus(status) {
  const value = String(status || "backlog").trim().toLowerCase();
  if (["backlog", "ready", "in_progress", "in_review", "done"].includes(value)) {
    return value;
  }
  return "backlog";
}

function appendSection(lines, title, value, { list = true } = {}) {
  if (value === null || value === undefined) {
    return;
  }

  const items = Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [String(value || "").trim()].filter(Boolean);

  if (items.length === 0) {
    return;
  }

  lines.push(`## ${title}`);
  if (list) {
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push(items.join(" "));
  }
  lines.push("");
}

function buildBody(task) {
  const lines = [];
  appendSection(lines, "Backlog ID", task.backlogRef, { list: false });
  appendSection(lines, "Objective", task.objective, { list: false });
  appendSection(lines, "Initial Nexus Status", normalizeStatus(task.status), { list: false });
  appendSection(lines, "Priority", String(task.priority || "").toUpperCase(), { list: false });
  appendSection(lines, "Phase", task.phase, { list: false });
  appendSection(lines, "Suggested Squad", task.suggestedSquad, { list: false });
  appendSection(lines, "Approved Scope", task.approvedScope);
  appendSection(lines, "Acceptance Criteria", task.acceptanceCriteria);
  appendSection(lines, "Dependencies", task.dependencies?.length ? task.dependencies : ["none"]);
  appendSection(
    lines,
    "Known External Access Gaps",
    task.externalAccessGaps?.length ? task.externalAccessGaps : ["none at this stage"],
  );
  appendSection(lines, "Explicitly Out of Scope For This Issue", task.outOfScope);
  appendSection(lines, "Agent Execution Rules", task.executionRules);
  return `${lines.join("\n").trim()}\n`;
}

function buildLabels(task) {
  const labels = new Set();
  labels.add(`status: ${normalizeStatus(task.status)}`);
  if (task.priority) {
    labels.add(`priority: ${String(task.priority).toLowerCase()}`);
  }
  for (const label of Array.isArray(task.labels) ? task.labels : []) {
    const value = String(label || "").trim();
    if (value) {
      labels.add(value);
    }
  }
  return [...labels];
}

async function githubRequest(token, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Codex",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(`GitHub ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const nexusEnv = loadEnvFile(NEXUS_ENV_PATH);
  const projectEnv = loadEnvFile(PROJECT_ENV_PATH);
  const token = String(nexusEnv.GITHUB_TOKEN || "").trim();
  const owner = String(projectEnv.GITHUB_OWNER || "").trim();
  const repo = String(projectEnv.GITHUB_REPO || "").trim();

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub token or target owner/repo.");
  }

  const backlog = JSON.parse(fs.readFileSync(BACKLOG_PATH, "utf8"));
  const issues = await githubRequest(token, `/repos/${owner}/${repo}/issues?state=all&per_page=100`);

  const existingByRef = new Map();
  for (const issue of issues) {
    if (issue.pull_request) {
      continue;
    }
    const title = String(issue.title || "");
    const match = title.match(/^(ARC-HACK-\d+)/);
    if (match) {
      existingByRef.set(match[1], issue);
    }
  }

  const created = [];
  const skipped = [];

  for (const task of backlog) {
    if (existingByRef.has(task.backlogRef)) {
      const existing = existingByRef.get(task.backlogRef);
      skipped.push({
        backlogRef: task.backlogRef,
        issueNumber: existing.number,
        url: existing.html_url,
        reason: "already exists",
      });
      continue;
    }

    const issue = await githubRequest(token, `/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: {
        title: task.title,
        body: buildBody(task),
        labels: buildLabels(task),
      },
    });

    created.push({
      backlogRef: task.backlogRef,
      issueNumber: issue.number,
      title: issue.title,
      url: issue.html_url,
    });
  }

  console.log(JSON.stringify({ owner, repo, created, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
