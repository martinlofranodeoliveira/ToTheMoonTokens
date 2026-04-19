<!--
  Thanks for the contribution. Please fill the sections below so reviewers
  have everything they need. If the checkboxes don't apply, explain why in
  the relevant section and delete the box.
-->

## Summary

<!-- 1-3 bullet points: what changed and why. Skip the "how" unless non-obvious. -->

## Motivation

<!-- Link the issue (TTM-xxx) or describe the problem this solves. -->

## Test plan

- [ ] `make api-cov` passes locally (coverage >= 70%).
- [ ] `make api-lint` and `make api-format` clean.
- [ ] `make api-typecheck` clean.
- [ ] If this touches trading logic: backtest metrics included below
      (`strategy_id`, `ending_equity`, `max_drawdown_pct`, `edge_status`).
- [ ] If this touches the dashboard: manual smoke on `make web-serve`.

## Guardrail impact

<!--
  If this PR touches services/api/src/tothemoon_api/guards.py, config.py,
  or any `.nexus/hooks*` file, describe the invariant that is preserved or
  why a change to the invariant is acceptable. Otherwise write "none".
-->

## Backtest evidence (if applicable)

<!--
| strategy_id    | lookback | net_profit | return_pct | drawdown_pct | edge_status |
| -------------- | -------- | ---------- | ---------- | ------------ | ----------- |
| ema_crossover  | 180      |            |            |              |             |
-->

## Notes for the reviewer

<!-- Risks, rollout considerations, follow-ups intentionally deferred. -->
