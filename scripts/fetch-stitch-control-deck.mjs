#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  callRemoteMcpTool,
} = require("../../NexusOrchestrator/server/services/remoteMcpClient.js");

const DEFAULT_ENV_PATH = "/mnt/c/SITES/gemini/NexusOrchestrator/.env";
const DEFAULT_GCLOUD =
  "/mnt/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud";
const STITCH_MCP_URL = "https://stitch.googleapis.com/mcp";
const PROJECT_ID = "5159730043801561055";
const ARTIFACT_DIR =
  "/mnt/c/sites/gemini/ToTheMoonTokens/apps/web/stitch/tothemoon-control-deck";
const RECORD_PATH =
  "/mnt/c/sites/gemini/ToTheMoonTokens/docs/stitch/tothemoon-control-deck-artifacts.md";

const SCREENS = [
  {
    title: "Desktop Command Deck",
    key: "desktop-command-deck",
    id: "394a949b" + "c0c34b6db2e76e2c571ae058", // pragma: allowlist secret
  },
  {
    title: "Mobile Research View",
    key: "mobile-research-view",
    id: "3fc93024" + "10334afc808d501fd259bc38", // pragma: allowlist secret
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
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

function readCommandOutput(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveHeaders(env) {
  const accessToken =
    env.STITCH_ACCESS_TOKEN || env.NEXUS_STITCH_ACCESS_TOKEN || "";
  const explicitProject =
    env.STITCH_GOOGLE_CLOUD_PROJECT ||
    env.NEXUS_STITCH_GOOGLE_CLOUD_PROJECT ||
    env.GOOGLE_CLOUD_PROJECT ||
    env.GCLOUD_PROJECT_ID ||
    "";

  if (accessToken && explicitProject) {
    return {
      Authorization: `Bearer ${accessToken}`,
      "X-Goog-User-Project": explicitProject,
    };
  }

  const gcloudCommand = env.NEXUS_STITCH_GCLOUD_COMMAND || DEFAULT_GCLOUD;
  const userToken = readCommandOutput(gcloudCommand, ["auth", "print-access-token"]);
  const gcloudProject = explicitProject || readCommandOutput(gcloudCommand, ["config", "get-value", "project"]);

  if (!userToken || !gcloudProject || gcloudProject === "(unset)") {
    throw new Error(
      "Stitch auth incompleta. Defina STITCH_ACCESS_TOKEN + STITCH_GOOGLE_CLOUD_PROJECT ou autentique uma conta humana no gcloud com um projeto válido.",
    );
  }

  return {
    Authorization: `Bearer ${userToken}`,
    "X-Goog-User-Project": gcloudProject,
  };
}

function normalizeToolPayload(result) {
  if (!result || !Array.isArray(result.content)) {
    return result;
  }

  const textEntry = result.content.find((entry) => entry.type === "text" && entry.text);
  if (!textEntry) {
    return result;
  }

  try {
    return JSON.parse(textEntry.text);
  } catch (_error) {
    return result;
  }
}

function downloadFile(url, destination) {
  execFileSync("curl", ["-L", "-sS", "-o", destination, url], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function ensureDirectories() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(RECORD_PATH), { recursive: true });
}

function writeRecord(entries) {
  const lines = [
    "# ToTheMoonTokens Control Deck Stitch Artifacts",
    "",
    "## Project",
    "",
    `- title: \`ToTheMoonTokens Control Deck\``,
    `- project id: \`${PROJECT_ID}\``,
    "",
    "## Screens",
    "",
  ];

  for (const entry of entries) {
    lines.push(`### ${entry.title}`);
    lines.push("");
    lines.push(`- screen id: \`${entry.screenId}\``);
    lines.push(`- screen name: \`${entry.name}\``);
    if (entry.htmlPath) {
      lines.push(`- HTML: \`${entry.htmlPath}\``);
    }
    if (entry.screenshotPath) {
      lines.push(`- Screenshot: \`${entry.screenshotPath}\``);
    }
    if (entry.jsonPath) {
      lines.push(`- JSON payload: \`${entry.jsonPath}\``);
    }
    lines.push("");
  }

  lines.push("## Notes");
  lines.push("");
  lines.push("- HTML and screenshots were downloaded from hosted Stitch URLs using `curl -L`.");
  lines.push("- This fetch requires OAuth-style credentials with a principal; API key only is not enough for `get_screen` in this environment.");
  lines.push("");

  fs.writeFileSync(RECORD_PATH, `${lines.join("\n")}\n`);
}

async function main() {
  const envFile = process.argv[2] || DEFAULT_ENV_PATH;
  const env = {
    ...process.env,
    ...loadEnvFile(envFile),
  };

  ensureDirectories();
  const headers = resolveHeaders(env);
  const entries = [];

  for (const screen of SCREENS) {
    const name = `projects/${PROJECT_ID}/screens/${screen.id}`;
    const raw = await callRemoteMcpTool(
      "get_screen",
      { name },
      {
        url: STITCH_MCP_URL,
        headers,
        timeoutMs: 45000,
      },
    );
    const payload = normalizeToolPayload(raw);
    const jsonPath = path.join(ARTIFACT_DIR, `${screen.key}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

    const htmlUrl = payload?.htmlCode?.downloadUrl || null;
    const screenshotUrl = payload?.screenshot?.downloadUrl || null;
    const htmlPath = htmlUrl ? path.join(ARTIFACT_DIR, `${screen.key}.html`) : null;
    const screenshotPath = screenshotUrl ? path.join(ARTIFACT_DIR, `${screen.key}.png`) : null;

    if (htmlUrl && htmlPath) {
      downloadFile(htmlUrl, htmlPath);
    }
    if (screenshotUrl && screenshotPath) {
      downloadFile(screenshotUrl, screenshotPath);
    }

    entries.push({
      title: screen.title,
      screenId: screen.id,
      name,
      htmlPath,
      screenshotPath,
      jsonPath,
    });
  }

  writeRecord(entries);
  console.log(JSON.stringify(entries, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
