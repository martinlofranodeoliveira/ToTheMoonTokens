---
name: Bug report
about: Report a reproducible defect in the API or dashboard.
title: "bug: <short summary>"
labels: ["bug", "triage"]
---

## Summary

<!-- One sentence describing the bug. -->

## Steps to reproduce

1.
2.
3.

## Expected vs actual

- **Expected:**
- **Actual:**

## Environment

- API version / commit SHA:
- Runtime: `paper` / `guarded_testnet` / other
- How launched: `make api-run` / `docker compose up` / other
- OS + Python version:

## Logs

<!-- Structured log lines with `request_id` if possible. Redact any secrets. -->

```
```

## Guardrail context

- Does this bug weaken or bypass any guardrail (mainnet block, wallet
  signature requirement, approval token check)?  **yes / no**
- If yes, **stop** and follow docs/SECURITY_RUNBOOK.md before posting
  reproduction steps publicly.

## Additional context

<!-- Screenshots, backtest inputs, anything else. -->
