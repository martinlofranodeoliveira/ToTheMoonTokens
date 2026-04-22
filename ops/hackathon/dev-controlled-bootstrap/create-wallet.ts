/**
 * create-wallet.ts — TTM Agent Market bootstrap
 *
 * Follows Circle's official Dev-Controlled Wallet quickstart, adapted to:
 *   - Reuse CIRCLE_ENTITY_SECRET if already set (you registered a ciphertext
 *     via the Console). Otherwise generate + register a fresh one.
 *   - Create a Wallet Set named "ttm-agent-market".
 *   - Create TWO wallets (source + destination) on Arc Testnet.
 *   - Pause while you fund the source wallet at https://faucet.circle.com.
 *   - Send 0.01 USDC to the destination wallet as a smoke test.
 *   - Verify both balances.
 *
 * The larger set of 5 additional agent wallets is created by
 * `create-remaining-wallets.ts` (no faucet step needed).
 *
 * Required .env:
 *   CIRCLE_API_KEY       — your Circle developer API key
 *   CIRCLE_ENTITY_SECRET — optional; reuse of an already-registered secret
 *
 * Usage:
 *   npm install
 *   node --env-file=.env --import=tsx create-wallet.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  registerEntitySecretCiphertext,
  initiateDeveloperControlledWalletsClient,
  type TokenBlockchain,
} from "@circle-fin/developer-controlled-wallets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "output");
const ENV_PATH = path.join(__dirname, ".env");
const WALLET_SET_NAME = "ttm-agent-market";
const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";

function appendEnv(line: string) {
  fs.appendFileSync(ENV_PATH, line.endsWith("\n") ? line : line + "\n", "utf-8");
}

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is required. Add it to .env first.");
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ------------------------------------------------------------------
  // Step 1: Entity Secret — reuse if present, otherwise generate + register
  // ------------------------------------------------------------------
  let entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (entitySecret && entitySecret.length === 64 && /^[0-9a-fA-F]+$/.test(entitySecret)) {
    console.log("Reusing CIRCLE_ENTITY_SECRET from .env (registration skipped).");
  } else {
    console.log("Generating and registering a fresh Entity Secret...");
    entitySecret = crypto.randomBytes(32).toString("hex");
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: OUTPUT_DIR,
    });
    appendEnv(`\nCIRCLE_ENTITY_SECRET=${entitySecret}`);
    console.log("Entity Secret registered. Recovery file saved to output/.");
  }

  // ------------------------------------------------------------------
  // Step 2: Wallet Set
  // ------------------------------------------------------------------
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  console.log("\nCreating Wallet Set...");
  const walletSet = (
    await client.createWalletSet({ name: WALLET_SET_NAME })
  ).data?.walletSet;
  if (!walletSet?.id) {
    throw new Error("Wallet Set creation failed: no ID returned");
  }
  console.log("Wallet Set ID:", walletSet.id);
  appendEnv(`CIRCLE_WALLET_SET_ID=${walletSet.id}`);

  // ------------------------------------------------------------------
  // Step 3: Source + destination wallets on Arc Testnet
  // ------------------------------------------------------------------
  console.log("\nCreating 2 wallets on ARC-TESTNET (source + destination)...");
  const wallets = (
    await client.createWallets({
      walletSetId: walletSet.id,
      blockchains: ["ARC-TESTNET"],
      count: 2,
      accountType: "EOA",
    })
  ).data?.wallets;
  if (!wallets || wallets.length < 2) {
    throw new Error("Wallet creation failed: expected 2 wallets");
  }
  const [source, destination] = wallets;
  console.log("Source      :", source.id, source.address);
  console.log("Destination :", destination.id, destination.address);

  appendEnv(`CIRCLE_WALLET_SOURCE_ID=${source.id}`);
  appendEnv(`CIRCLE_WALLET_SOURCE_ADDRESS=${source.address}`);
  appendEnv(`CIRCLE_WALLET_DEST_ID=${destination.id}`);
  appendEnv(`CIRCLE_WALLET_DEST_ADDRESS=${destination.address}`);
  appendEnv(`CIRCLE_WALLET_BLOCKCHAIN=${source.blockchain}`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "wallets-bootstrap.json"),
    JSON.stringify({ walletSet, wallets }, null, 2),
    "utf-8",
  );

  // ------------------------------------------------------------------
  // Step 4: Pause for faucet funding on the source wallet
  // ------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("FUND THE SOURCE WALLET AT THE CIRCLE FAUCET:");
  console.log("  1. Open https://faucet.circle.com");
  console.log("  2. Select 'Arc Testnet'");
  console.log("  3. Paste address:", source.address);
  console.log("  4. Click 'Send USDC'");
  console.log("------------------------------------------------------------");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) =>
    rl.question("\nPress Enter once the faucet has delivered USDC... ", () => {
      rl.close();
      resolve();
    }),
  );

  // ------------------------------------------------------------------
  // Step 5: Smoke transfer — 0.01 USDC from source to destination
  // ------------------------------------------------------------------
  console.log("\nSending 0.01 USDC as smoke test...");
  const txResponse = await client.createTransaction({
    blockchain: source.blockchain as TokenBlockchain,
    walletAddress: source.address,
    destinationAddress: destination.address,
    amount: ["0.01"],
    tokenAddress: ARC_TESTNET_USDC,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  const txId = txResponse.data?.id;
  if (!txId) throw new Error("Transaction creation failed: no ID");
  console.log("Transaction ID:", txId);

  const terminal = new Set(["COMPLETE", "FAILED", "CANCELLED", "DENIED"]);
  let state: string | undefined = txResponse.data?.state;
  while (!state || !terminal.has(state)) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await client.getTransaction({ id: txId });
    state = poll.data?.transaction?.state;
    const hash = poll.data?.transaction?.txHash;
    console.log("Transaction state:", state ?? "(pending)");
    if (state === "COMPLETE" && hash) {
      console.log("Explorer:", `https://testnet.arcscan.app/tx/${hash}`);
    }
  }
  if (state !== "COMPLETE") {
    throw new Error(`Transaction ended in non-terminal state: ${state}`);
  }

  // ------------------------------------------------------------------
  // Step 6: Verify balances
  // ------------------------------------------------------------------
  const printBalances = async (label: string, id: string) => {
    const balances = (await client.getWalletTokenBalance({ id })).data?.tokenBalances;
    console.log(`\n${label} balances:`);
    for (const b of balances ?? []) {
      console.log(`  ${b.token?.symbol ?? "?"}: ${b.amount}`);
    }
  };
  await printBalances("Source", source.id);
  await printBalances("Destination", destination.id);

  console.log("\nDone. Next: run `npm run scale` to create the remaining 5 agent wallets.");
}

main().catch((err) => {
  console.error("\nError:", err?.message || err);
  process.exit(1);
});
