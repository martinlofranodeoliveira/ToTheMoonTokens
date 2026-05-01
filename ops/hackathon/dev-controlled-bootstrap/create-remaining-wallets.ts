/**
 * create-remaining-wallets.ts — create the 5 extra agent wallets
 *
 * Run AFTER create-wallet.ts. Reads CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET and
 * CIRCLE_WALLET_SET_ID from .env, creates 5 more EOA wallets on Arc Testnet
 * in the same wallet set, and appends their IDs + addresses to .env.
 *
 * No faucet step required. Only the source wallet needs USDC; the others get
 * funded per-agent later via smoke transfers from the source.
 *
 * Usage:
 *   node --env-file=.env --import=tsx create-remaining-wallets.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "output");
const ENV_PATH = path.join(__dirname, ".env");

// Roles mapped in order to the 5 wallets created. Index 0..4.
const ROLES = ["research_01", "research_02", "research_03", "consumer_02", "auditor"];
// Note: source (create-wallet.ts index 0) = research_00 effectively;
// destination (index 1) = consumer_01; treasury is created separately below.

function appendEnv(line: string) {
  fs.appendFileSync(ENV_PATH, line.endsWith("\n") ? line : line + "\n", "utf-8");
}

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!apiKey || !entitySecret || !walletSetId) {
    throw new Error(
      "Missing env vars. Expected CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_SET_ID in .env.",
    );
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  console.log(`Creating 5 additional wallets + 1 treasury wallet on ARC-TESTNET...`);

  const agentWallets = (
    await client.createWallets({
      walletSetId,
      blockchains: ["ARC-TESTNET"],
      count: 5,
      accountType: "EOA",
    })
  ).data?.wallets;
  if (!agentWallets || agentWallets.length < 5) {
    throw new Error("Agent wallet creation failed");
  }

  const treasuryWallets = (
    await client.createWallets({
      walletSetId,
      blockchains: ["ARC-TESTNET"],
      count: 1,
      accountType: "EOA",
    })
  ).data?.wallets;
  if (!treasuryWallets || treasuryWallets.length < 1) {
    throw new Error("Treasury wallet creation failed");
  }
  const treasury = treasuryWallets[0];

  const labeled = agentWallets.map((w, i) => ({ role: ROLES[i], wallet: w }));
  labeled.push({ role: "treasury", wallet: treasury });

  console.log("\nCreated agent wallets:");
  for (const { role, wallet } of labeled) {
    console.log(`  ${role.padEnd(12)} ${wallet.id} ${wallet.address}`);
    const envPrefix = `CIRCLE_WALLET_${role.toUpperCase()}`;
    appendEnv(`${envPrefix}_ID=${wallet.id}`);
    appendEnv(`${envPrefix}_ADDRESS=${wallet.address}`);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "agent-wallets.json"),
    JSON.stringify(labeled, null, 2),
    "utf-8",
  );
  console.log("\nSaved output/agent-wallets.json and appended IDs to .env.");
  console.log("Total wallets in set now: 2 (bootstrap) + 5 (agents) + 1 (treasury) = 8");
}

main().catch((err) => {
  console.error("\nError:", err?.message || err);
  process.exit(1);
});
