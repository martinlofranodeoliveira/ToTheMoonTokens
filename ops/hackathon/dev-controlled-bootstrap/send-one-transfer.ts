import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initiateDeveloperControlledWalletsClient,
  type TokenBlockchain,
} from "@circle-fin/developer-controlled-wallets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
const TERMINAL_STATES = new Set(["COMPLETE", "FAILED", "CANCELLED", "DENIED"]);

const ADDRESS_BOOK: Record<string, string> = {
  research_00: "0xde618b260763a606e0380150d1338364f5ff3139",
  research_01: "0x9a2b38ec283d3a51faa3095f0c0708c1b225462a",
  research_02: "0x95140a42f10eb10551e076ed8d9a2ad8dcdb968d",
  research_03: "0xbcdb0012b84dc6158c50b1e353b1627d2d4af8aa",
  consumer_01: "0x28c83e915c791131678286977a42c6fe95da9a42",
  consumer_02: "0xa82aa51fd19476a1dc37759b0fc41770f4a238d8",
  auditor: "0x0201fdaa7b7298f351d8bc58cb045abe7089bb01",
  treasury: "0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f",
};

type CliOptions = {
  from: string;
  to: string;
  amount: string;
  blockchain: TokenBlockchain;
  yes: boolean;
};

function usage(): void {
  console.log(`Usage:
  npm run send -- --from research_03 --to treasury --amount 0.001 --yes

Options:
  --from         Source wallet alias or raw 0x address. Default: research_03
  --to           Destination wallet alias or raw 0x address. Default: treasury
  --amount       USDC amount. Default: 0.001
  --blockchain   Default: ARC-TESTNET
  --yes          Required to actually submit the transfer
  --help         Show this message
`);
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function bootstrapEnv(): void {
  loadEnvFile(path.join(ROOT_DIR, ".env"));
  loadEnvFile(path.join(ROOT_DIR, ".env.hackathon"));
}

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function resolveAddress(input: string): { label: string; address: string } {
  const normalized = input.trim().toLowerCase();
  const address = ADDRESS_BOOK[normalized];
  if (address) {
    return { label: normalized, address };
  }
  if (isAddress(input.trim())) {
    return { label: input.trim(), address: input.trim() };
  }
  throw new Error(`Unknown wallet alias or invalid address: ${input}`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    from: "research_03",
    to: "treasury",
    amount: "0.001",
    blockchain: "ARC-TESTNET" as TokenBlockchain,
    yes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--from":
        options.from = argv[++i] || "";
        break;
      case "--to":
        options.to = argv[++i] || "";
        break;
      case "--amount":
        options.amount = argv[++i] || "";
        break;
      case "--blockchain":
        options.blockchain = (argv[++i] || "") as TokenBlockchain;
        break;
      case "--yes":
        options.yes = true;
        break;
      case "--help":
      case "-h":
        usage();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.from || !options.to || !options.amount || Number(options.amount) <= 0) {
    throw new Error("Invalid arguments. Use --help for usage.");
  }

  return options;
}

async function main(): Promise<void> {
  bootstrapEnv();
  const options = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv("CIRCLE_API_KEY");
  const entitySecret = requireEnv("CIRCLE_ENTITY_SECRET");
  const source = resolveAddress(options.from);
  const destination = resolveAddress(options.to);

  console.log("About to submit a real Circle transfer:");
  console.log(`  Source      ${source.label} -> ${source.address}`);
  console.log(`  Destination ${destination.label} -> ${destination.address}`);
  console.log(`  Amount      ${options.amount} USDC`);
  console.log(`  Network     ${options.blockchain}`);
  console.log("");

  if (!options.yes) {
    console.log("Dry run only. Re-run with --yes to actually send the transfer.");
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  const tx = await client.createTransaction({
    blockchain: options.blockchain,
    walletAddress: source.address,
    destinationAddress: destination.address,
    amount: [options.amount],
    tokenAddress: ARC_TESTNET_USDC,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const txId = tx.data?.id;
  if (!txId) {
    throw new Error("Circle did not return a transaction id.");
  }

  console.log(`Transaction ID: ${txId}`);
  let state = tx.data?.state;
  let txHash = tx.data?.txHash || "";

  while (!state || !TERMINAL_STATES.has(state)) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await client.getTransaction({ id: txId });
    state = poll.data?.transaction?.state;
    txHash = poll.data?.transaction?.txHash || txHash;
    console.log(`State: ${state ?? "PENDING"}`);
  }

  if (state !== "COMPLETE" || !txHash) {
    throw new Error(`Transfer did not complete successfully. Final state: ${state ?? "unknown"}`);
  }

  console.log("");
  console.log(`TX hash: ${txHash}`);
  console.log(`Arcscan: https://testnet.arcscan.app/tx/${txHash}`);
  console.log("");
  console.log("Paste the TX hash into the marketplace checkout and click Verify settlement.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
