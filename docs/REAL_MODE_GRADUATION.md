# Real-Mode Graduation and Blockers

This repository remains a research, backtesting, paper-trading, and guarded-testnet workspace. This document defines the minimum governance and evidence required before anyone can even discuss a future real-money mode.

This is not an implementation plan for live trading.

## Hard policy

- no automatic real-funds execution is allowed in this scope
- no mainnet order path is approved in this repository
- no wallet auto-signing is allowed; any wallet action must remain manual-signature only
- paper and testnet criteria are necessary but not sufficient for any future real-mode discussion
- real-mode remains blocked until every blocker in this document is cleared by humans outside the runtime

## Graduation ladder

A strategy can only move forward in this order:

1. reproducible backtest
2. walk-forward validation
3. paper-trading journal with audit trail
4. guarded Binance testnet with manual approval
5. architecture and compliance review
6. separate human approval for any future real-mode pilot

Failing any stage sends the strategy back to the previous safe stage.

## Minimum evidence before any future real-mode review

All of the following must be true at the same time.

### Edge

- positive net return after fees and slippage
- profit factor materially above breakeven; minimum target: `> 1.20`
- win/loss profile remains acceptable across more than one symbol or market window
- no single outlier trade is responsible for most of the result
- minimum sample size: at least `200` trades across the validated window

### Drawdown

- max drawdown must stay below the stricter of:
  - half of the approved paper/testnet drawdown budget, or
  - `5%` peak-to-trough on the validation portfolio
- worst day must stay within the daily loss budget
- no unbounded averaging down, martingale, or recovery-only sizing logic

### Stability

- metrics must survive at least `8` consecutive weeks of paper trading and `4` consecutive weeks of guarded testnet observation
- no unresolved gaps in fills, PnL attribution, or event logs during the validation window
- behavior must remain consistent across at least `3` separated market regimes or volatility windows
- operational failures, restarts, and degraded data conditions must be observable and attributable

These thresholds are intentionally stricter than paper/testnet entry checks. Passing paper or testnet alone does not qualify a strategy for real mode.

## Manual approval workflow for any future real-mode activation

A future real-mode pilot, if ever considered, must require all steps below.

1. strategy owner submits an evidence pack with backtest, walk-forward, paper journal, and guarded-testnet results
2. risk reviewer confirms edge, drawdown, stability, and exposure limits
3. security reviewer confirms secret separation, access boundaries, and manual-signature flow
4. operator validates that kill switch and audit trail are working in a dry run
5. an authorized human approver records a dated approval decision with scope, expiry, and limits
6. runtime remains blocked unless the human approval artifact is present and manually rechecked
7. any material strategy change, secret rotation, or runtime incident invalidates the approval and returns the system to blocked mode

## Required kill switch design

Any future real-mode discussion is blocked without all of these controls:

- global kill switch that immediately stops new order submission attempts
- strategy-level kill switch to isolate a single strategy without affecting the rest of the platform
- connector-level kill switch for exchange, wallet, and market-data dependencies
- automatic fallback to blocked mode after restart until humans re-approve
- explicit operator runbook for who can trigger the kill switch and how the trigger is audited

## Audit trail requirements

A future real-mode pilot is blocked without an audit trail that records:

- who approved activation
- when approval was granted and when it expires
- which strategy, symbols, limits, and environments were approved
- every manual activation and deactivation event
- every kill-switch event and the reason
- every secret rotation and access review
- every incident, rollback, and postmortem link

Silent activation is forbidden.

## Secret separation requirements

Real-mode consideration is blocked until secrets are separated from the app runtime.

Minimum separation:

- no production secret in repo, `.env.example`, tests, fixtures, or client code
- exchange credentials, wallet tooling, and approval artifacts must live in separate trust boundaries
- the runtime must not hold wallet seed phrases or private keys for automated signing
- approval tokens must not be treated as trading credentials
- read-only observability access must be separable from any privileged execution access

## Blockers that still prevent any rollout real

The following blockers remain open and intentionally keep real mode unavailable:

- no approved compliance or legal process in scope
- no custody model approved in scope
- no production credential handling approved in scope
- no production incident runbook approved in scope
- no manual-approval registry or signed approval artifact implemented in scope
- no proof here authorizes mainnet execution

## Non-goals for GH-10

This issue does not:

- implement real trading execution
- implement wallet auto-signing
- approve use of real funds
- lower guardrails that already keep mainnet blocked

## Repository-aligned verification cues

The repository should continue to show the following behavior after this document lands:

- default runtime stays in `paper`
- guarded activation can only refer to testnet and manual approval
- mainnet submission remains blocked by policy
- missing approval evidence should fail closed with explicit reasons
