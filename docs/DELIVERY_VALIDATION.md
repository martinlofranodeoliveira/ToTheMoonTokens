# Delivery Validation Flow

This document closes the operational gap tracked in `TTM-006`: mirror verification, recoverable review evidence, and explicit failure behavior.

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

## 4. Evidence locations

- mirror evidence: `ops/evidence/mirror-verification.json`
- review/runtime evidence: `ops/evidence/*.json`
- Nexus runtime logs: local runtime log path configured by the project profile

## 5. Failure semantics

The validation flow must fail explicitly when:

- a material check fails
- GitHub and GitLab refs diverge
- a requested branch is missing on one remote
- the review gate cannot be queried
- the Nexus runtime is unhealthy

Silent approval is not acceptable for this repository.
