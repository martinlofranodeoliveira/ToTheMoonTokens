# Delivery Validation Flow

This document closes the operational gap tracked in `TTM-006`: mirror verification, recoverable review evidence, and explicit failure behavior.

For production release evidence, use `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` in addition to this validation flow. The production checklist adds deployment gates, secret-reference rules, health/readiness smoke checks, rollback evidence, and a copyable operator evidence template.

## 1. Run the material checks

From the repository root:

```bash
make api-test
make api-lint
make api-typecheck
```

If any step fails, stop the rollout and keep the task blocked.

## 2. Verify GitHub and GitLab stay aligned

Run the mirror checker with the branches you expect to exist on both remotes:

```bash
./scripts/verify_mirror.sh main "$(git rev-parse --abbrev-ref HEAD)"
```

Behavior:

- writes `ops/evidence/mirror-verification.json`
- exits `0` only when every requested branch exists on both remotes and the SHAs match
- exits non-zero if a branch is missing, mismatched, or a remote cannot be queried

This is intentionally fail-closed.

## 3. Collect review and runtime evidence

After tests and mirror verification, collect a local artifact that records:

- current branch and commit
- Nexus health snapshot
- OpenCode review-gate configuration
- task snapshot from `/api/tasks`
- relevant log excerpts for the task under review

Example:

```bash
python3 scripts/collect_validation_evidence.py \
  --task GH-6 \
  --checks "python3 -m pytest -q" "python3 -m ruff check ." \
  --output ops/evidence/gh-6-validation.json
```

If CI or PR URLs are available in the environment, the artifact records them too.

For backend/frontend release validation evidence, run:

```bash
make ci-evidence
```

This writes `ops/evidence/backend-frontend-ci-evidence.json` with timestamps, command names, pass/fail status, exit codes, and short command output tails. The command fails fast on missing prerequisites such as `python3`, `make`, `node`, or `npm`, and it records only CI metadata plus command output rather than environment values.

## 4. Evidence locations

- mirror evidence: `ops/evidence/mirror-verification.json`
- review/runtime evidence: `ops/evidence/*.json`
- backend/frontend CI evidence: `ops/evidence/backend-frontend-ci-evidence.json` uploaded by GitHub Actions and GitLab CI
- VM deploy CI evidence: `ops/evidence/vm-deploy-ci-evidence.json` uploaded by GitHub Actions and GitLab CI
- Nexus runtime logs: local runtime log path configured by the project profile

## 5. Failure semantics

The validation flow must fail explicitly when:

- a material check fails
- GitHub and GitLab refs diverge
- a requested branch is missing on one remote
- the review gate cannot be queried
- the Nexus runtime is unhealthy

Silent approval is not acceptable for this repository.
