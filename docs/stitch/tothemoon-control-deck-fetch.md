# ToTheMoonTokens Control Deck Stitch Fetch

## Requested project

- title: `ToTheMoonTokens Control Deck`
- project id: `5159730043801561055`

## Requested screens

1. `Desktop Command Deck`
   - screen id: `394a949bc0c34b6db2e76e2c571ae058`
2. `Mobile Research View`
   - screen id: `3fc9302410334afc808d501fd259bc38`

## What was verified

- The Stitch MCP endpoint is reachable from this machine.
- The local Nexus bridge can list Stitch tools successfully.
- The `.env` file at `/mnt/c/SITES/gemini/NexusOrchestrator/.env` contains `STITCH_API_KEY`.
- In this environment, `get_screen` rejects API-key-only auth and requires principal-based auth.
- The active `gcloud` account is a service account on project `zellolife`.
- That account does not currently have the required Stitch project/API enablement permissions.

## Prepared fetch script

Use:

```bash
node /mnt/c/sites/gemini/ToTheMoonTokens/scripts/fetch-stitch-control-deck.mjs
```

The script will:

- call Stitch `get_screen` for both requested screens
- save JSON payloads under:
  - `/mnt/c/sites/gemini/ToTheMoonTokens/apps/web/stitch/tothemoon-control-deck/`
- download hosted HTML and screenshots with `curl -L`
- write a final artifact record to:
  - `/mnt/c/sites/gemini/ToTheMoonTokens/docs/stitch/tothemoon-control-deck-artifacts.md`

## What is still needed

One of these:

1. A human `gcloud` login with access to the Stitch project and a valid Google Cloud project with Stitch API enabled.
2. `STITCH_ACCESS_TOKEN` plus `STITCH_GOOGLE_CLOUD_PROJECT` exported in the environment or added to the `.env`.

## Recommended auth flow

```bash
'/mnt/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud' auth login
'/mnt/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud' config set project YOUR_GOOGLE_CLOUD_PROJECT
```

If you also want ADC-based flows later:

```bash
'/mnt/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk/bin/gcloud' auth application-default login
```
