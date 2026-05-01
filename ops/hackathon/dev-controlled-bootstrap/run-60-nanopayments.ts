/**
 * run-60-nanopayments.ts — generate 63 real Arc Testnet nanopayments
 *
 * Satisfies hackathon requirement: "50+ onchain transactions in demo".
 *
 * Cycles 9 rounds × 7 destinations = 63 transfers of 0.001 USDC each
 * from research_00 (source) through the rest of the agent fleet.
 *
 * Total USDC moved: 0.063 USDC (well within source wallet balance).
 * Expected runtime: ~5 minutes (sequential fire + poll to COMPLETE).
 *
 * Output: ops/evidence/nanopayments-batch-<date>.json with full tx log,
 * plus stdout progress for live monitoring.
 *
 * Usage:
 *   npm run batch
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initiateDeveloperControlledWalletsClient,
  type TokenBlockchain,
} from "@circle-fin/developer-controlled-wallets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../ops/evidence");

const ARC_USDC = "0x3600000000000000000000000000000000000000";
const AMOUNT = "0.001"; // sub-cent, ≤ $0.01 hackathon requirement
const ROUNDS = 9; // 9 rounds × 7 destinations = 63 transactions
const INTER_TX_DELAY_MS = 400;

type Agent = { name: string; address: string };

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

async function main() {
  const apiKey = requireEnv("CIRCLE_API_KEY");
  const entitySecret = requireEnv("CIRCLE_ENTITY_SECRET");

  const source: Agent = {
    name: "research_00",
    address: requireEnv("CIRCLE_WALLET_SOURCE_ADDRESS"),
  };
  const destinations: Agent[] = [
    { name: "consumer_01", address: requireEnv("CIRCLE_WALLET_DEST_ADDRESS") },
    { name: "research_01", address: requireEnv("CIRCLE_WALLET_RESEARCH_01_ADDRESS") },
    { name: "research_02", address: requireEnv("CIRCLE_WALLET_RESEARCH_02_ADDRESS") },
    { name: "research_03", address: requireEnv("CIRCLE_WALLET_RESEARCH_03_ADDRESS") },
    { name: "consumer_02", address: requireEnv("CIRCLE_WALLET_CONSUMER_02_ADDRESS") },
    { name: "auditor", address: requireEnv("CIRCLE_WALLET_AUDITOR_ADDRESS") },
    { name: "treasury", address: requireEnv("CIRCLE_WALLET_TREASURY_ADDRESS") },
  ];

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  const TERMINAL = new Set(["COMPLETE", "FAILED", "CANCELLED", "DENIED"]);

  const results: Array<Record<string, unknown>> = [];
  const total = ROUNDS * destinations.length;
  const startTotal = Date.now();

  console.log(`Starting batch: ${total} transfers of ${AMOUNT} USDC each`);
  console.log(`Source: ${source.name} ${source.address}`);
  console.log(`Destinations: ${destinations.map((d) => d.name).join(", ")}`);
  console.log("");

  for (let r = 0; r < ROUNDS; r++) {
    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      const seq = r * destinations.length + i + 1;
      const t0 = Date.now();

      process.stdout.write(`[${seq.toString().padStart(2, "0")}/${total}] ${source.name} → ${dest.name.padEnd(12)} `);

      try {
        const tx = await client.createTransaction({
          blockchain: "ARC-TESTNET" as TokenBlockchain,
          walletAddress: source.address,
          destinationAddress: dest.address,
          amount: [AMOUNT],
          tokenAddress: ARC_USDC,
          fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        });
        const id = tx.data?.id;
        if (!id) throw new Error("No transaction id returned");

        let state: string | undefined = tx.data?.state;
        let txHash = "";
        let pollCount = 0;
        while (!state || !TERMINAL.has(state)) {
          await new Promise((res) => setTimeout(res, 2000));
          const poll = await client.getTransaction({ id });
          state = poll.data?.transaction?.state;
          txHash = poll.data?.transaction?.txHash || txHash;
          pollCount += 1;
          if (pollCount > 30) break; // 60s hard timeout safety
        }

        const elapsed = Date.now() - t0;
        const result = {
          seq,
          from: source.name,
          to: dest.name,
          amount_usdc: AMOUNT,
          state,
          tx_hash: txHash,
          elapsed_ms: elapsed,
          timestamp: new Date().toISOString(),
        };
        results.push(result);
        console.log(`${state} in ${elapsed}ms · ${txHash.slice(0, 10)}...${txHash.slice(-6)}`);
      } catch (err) {
        const msg = (err as Error).message || String(err);
        results.push({
          seq,
          from: source.name,
          to: dest.name,
          error: msg,
          timestamp: new Date().toISOString(),
        });
        console.log(`ERROR: ${msg.slice(0, 80)}`);
      }

      await new Promise((res) => setTimeout(res, INTER_TX_DELAY_MS));
    }
  }

  const totalElapsed = Date.now() - startTotal;
  const complete = results.filter((r) => r.state === "COMPLETE");
  const latencies = (complete as Array<{ elapsed_ms: number }>)
    .map((r) => r.elapsed_ms)
    .sort((a, b) => a - b);
  const pct = (arr: number[], p: number) =>
    arr.length ? arr[Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * p)))] : 0;
  const p50 = pct(latencies, 0.5);
  const p95 = pct(latencies, 0.95);
  const throughputPerMin = complete.length ? Math.round(((complete.length / totalElapsed) * 60000) * 10) / 10 : 0;
  const totalUsdc = (Number(AMOUNT) * complete.length).toFixed(6);

  const evidence = {
    batch: "nanopayments-hackathon-evidence",
    project: "TTM Agent Market",
    generated_at: new Date().toISOString(),
    blockchain: "ARC-TESTNET",
    wallet_set_id: requireEnv("CIRCLE_WALLET_SET_ID"),
    summary: {
      total_attempted: results.length,
      successful: complete.length,
      failed: results.length - complete.length,
      total_elapsed_s: Math.round(totalElapsed / 1000),
      latency_p50_ms: p50,
      latency_p95_ms: p95,
      throughput_tx_per_min: throughputPerMin,
      total_usdc_moved: totalUsdc,
      amount_per_tx_usdc: AMOUNT,
    },
    source,
    destinations,
    transactions: results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.join(OUT_DIR, `nanopayments-batch-${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));

  console.log("");
  console.log("========================================");
  console.log(`Summary: ${complete.length}/${results.length} complete in ${Math.round(totalElapsed / 1000)}s`);
  console.log(`Latency p50: ${p50}ms · p95: ${p95}ms`);
  console.log(`Throughput: ${throughputPerMin} tx/min`);
  console.log(`Total USDC moved: ${totalUsdc}`);
  console.log(`Evidence: ${outPath}`);
  console.log("========================================");

  if (complete.length < 50) {
    console.error("\nWARNING: fewer than 50 successful transactions — hackathon requirement not met.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
