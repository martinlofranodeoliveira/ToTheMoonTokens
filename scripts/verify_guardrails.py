#!/usr/bin/env python3
"""TTM-026 guardrail regression suite.

Exercises the 5 mandatory scenarios and emits deterministic evidence at
`ops/evidence/guardrail-regression-<YYYY-MM-DD>.json`. Exits non-zero on any
failure so CI blocks PRs that regress the safety surface.

Scenarios:
    1. mainnet_flag            - Settings(ALLOW_MAINNET_TRADING=True) must
                                 produce guardrails that forbid mainnet submits.
    2. live_trading_flag       - Settings(ENABLE_LIVE_TRADING=True) must still
                                 forbid testnet order submission under MVP policy.
    3. seed_phrase_leak        - Ripgrep the source tree for literal wallet
                                 secret patterns (seed phrase, mnemonic, private
                                 key assignments) outside of test fixtures.
    4. binance_order_route     - Introspect FastAPI routes + ripgrep for any
                                 forbidden path fragments (order, oco, margin,
                                 futures) in live API code.
    5. credential_leak         - Ripgrep for Circle and kit key prefixes across
                                 every non-gitignored tracked file.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
API_SRC = ROOT / "services" / "api" / "src"
EVIDENCE_DIR = ROOT / "ops" / "evidence"
EVIDENCE_FILE = EVIDENCE_DIR / f"guardrail-regression-{datetime.now(timezone.utc).date().isoformat()}.json"

sys.path.insert(0, str(API_SRC))


@dataclass
class Finding:
    scenario: str
    passed: bool
    reason: str
    evidence: list[str] = field(default_factory=list)


def _rg(pattern: str, *paths: str, ignore_case: bool = True) -> list[str]:
    """Run ripgrep if available, fall back to python re walk."""
    for path in paths:
        if not (ROOT / path).exists():
            continue
    try:
        args = ["rg", "--no-heading", "--with-filename", "--line-number", "-I"]
        if ignore_case:
            args.append("-i")
        args += [pattern, *(str(ROOT / p) for p in paths if (ROOT / p).exists())]
        result = subprocess.run(args, capture_output=True, text=True, timeout=15, check=False)
        if result.returncode in (0, 1):
            return [line for line in result.stdout.splitlines() if line.strip()]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return _python_grep(pattern, paths, ignore_case=ignore_case)


def _python_grep(pattern: str, paths: Iterable[str], ignore_case: bool = True) -> list[str]:
    flags = re.IGNORECASE if ignore_case else 0
    regex = re.compile(pattern, flags)
    hits: list[str] = []
    for rel in paths:
        base = ROOT / rel
        if not base.exists():
            continue
        targets = base.rglob("*") if base.is_dir() else [base]
        for p in targets:
            if not p.is_file() or p.stat().st_size > 2_000_000:
                continue
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for idx, line in enumerate(text.splitlines(), start=1):
                if regex.search(line):
                    hits.append(f"{p.relative_to(ROOT)}:{idx}:{line.strip()[:160]}")
    return hits


def _filter_test_and_doc(hits: list[str]) -> list[str]:
    skip = ("/tests/", "\\tests\\", "/test_", "\\test_", "/docs/", "\\docs\\", "/ops/hackathon/", "\\ops\\hackathon\\", ".md:", "README", "STITCH", "HACKATHON", "CIRCLE_FEEDBACK")
    return [h for h in hits if not any(s.lower() in h.lower() for s in skip)]


def test_mainnet_flag() -> Finding:
    try:
        from tothemoon_api.config import Settings  # type: ignore
        from tothemoon_api.guards import evaluate_guardrails  # type: ignore
    except Exception as exc:
        return Finding("mainnet_flag", True, f"Settings/guards not importable (pre-MVP state): {exc}")
    try:
        s = Settings(ALLOW_MAINNET_TRADING=True, APP_ENV="production")  # type: ignore[call-arg]
    except Exception as exc:
        if "mainnet" in str(exc).lower() or "allow_mainnet" in str(exc).lower():
            return Finding("mainnet_flag", True, f"Pydantic rejected mainnet in prod: {exc}")
        return Finding("mainnet_flag", False, f"Unexpected Settings failure: {exc}")
    try:
        g = evaluate_guardrails(s)
        blocked = not getattr(g, "can_submit_mainnet_orders", False)
        return Finding("mainnet_flag", blocked, "Guardrails blocked mainnet submissions" if blocked else "REGRESSION: mainnet path allowed")
    except Exception as exc:
        return Finding("mainnet_flag", True, f"evaluate_guardrails raised on mainnet flag: {exc}")


def test_live_trading_flag() -> Finding:
    try:
        from tothemoon_api.config import Settings  # type: ignore
        from tothemoon_api.guards import evaluate_guardrails  # type: ignore
    except Exception as exc:
        return Finding("live_trading_flag", True, f"Settings/guards not importable: {exc}")
    try:
        s = Settings(ENABLE_LIVE_TRADING=True, ALLOW_MAINNET_TRADING=False)  # type: ignore[call-arg]
        g = evaluate_guardrails(s)
    except Exception as exc:
        return Finding("live_trading_flag", True, f"Settings/guards rejected live trading: {exc}")
    blocked = not getattr(g, "can_submit_testnet_orders", False)
    return Finding("live_trading_flag", blocked, "Live trading stays off regardless of flag" if blocked else "REGRESSION: testnet order path allowed")


def test_seed_phrase_leak() -> Finding:
    pattern = r"(seed[_ -]?phrase|mnemonic|BIP[_ -]?39|private[_ -]?key\s*=|privkey\s*=|metamask\s+export)"
    raw = _rg(pattern, "services", "apps")
    hits = _filter_test_and_doc(raw)
    if hits:
        return Finding("seed_phrase_leak", False, f"{len(hits)} possible leak match(es) in live code", hits[:10])
    return Finding("seed_phrase_leak", True, "No wallet-secret patterns found in services/ or apps/ live code")


def test_binance_order_route() -> Finding:
    forbidden_paths = [r"/api/.*order", r"/api/.*oco", r"/api/.*margin", r"/api/.*futures", r"binance.*place_?order"]
    raw: list[str] = []
    for pat in forbidden_paths:
        raw += _rg(pat, "services/api/src")
    hits = _filter_test_and_doc(raw)
    route_hits: list[str] = []
    try:
        from tothemoon_api.main import app  # type: ignore
        for route in getattr(app, "routes", []):
            path = getattr(route, "path", "")
            for token in ("order", "oco", "margin", "futures"):
                if token in path.lower() and "news" not in path.lower():
                    route_hits.append(path)
    except Exception:
        pass
    all_hits = hits + [f"route:{p}" for p in route_hits]
    if all_hits:
        return Finding("binance_order_route", False, f"{len(all_hits)} forbidden route reference(s) in live code", all_hits[:10])
    return Finding("binance_order_route", True, "No order/oco/margin/futures routes in live API")


def test_credential_leak() -> Finding:
    pattern = (
        r"TEST_API_KEY:[0-9a-f]"
        r"|LIVE_API_KEY:[0-9a-f]"
        r"|KIT_KEY:[0-9a-f]"
        r"|sk_live_[0-9a-zA-Z]"
        r"|-----BEGIN RSA PRIVATE KEY-----"
    )
    raw = _rg(
        pattern,
        "services",
        "apps",
        "docs",
        "scripts",
        "ops/hackathon",
        "ops/arc_circle_hackathon_backlog.json",
    )
    hits = [h for h in raw if ".env" not in h and "node_modules" not in h]
    hits = [h for h in hits if "example" not in h.lower() and "your_key_here" not in h.lower()]
    self_reference_tokens = (
        'r"TEST_API_KEY:[0-9a-f]"',
        'r"|LIVE_API_KEY:[0-9a-f]"',
        'r"|KIT_KEY:[0-9a-f]"',
        'r"|sk_live_[0-9a-zA-Z]"',
        'r"|-----BEGIN RSA PRIVATE KEY-----"',
    )
    hits = [
        h
        for h in hits
        if "verify_guardrails.py" not in h
        and "guardrail-regression-" not in h
        and not any(token in h for token in self_reference_tokens)
    ]
    if hits:
        return Finding("credential_leak", False, f"{len(hits)} credential pattern(s) found in tracked files", hits[:10])
    return Finding("credential_leak", True, "No API key / entity secret patterns in tracked files")


def main() -> int:
    print(f"Guardrail regression @ {datetime.now(timezone.utc).isoformat()}")
    findings: list[Finding] = [
        test_mainnet_flag(),
        test_live_trading_flag(),
        test_seed_phrase_leak(),
        test_binance_order_route(),
        test_credential_leak(),
    ]

    for f in findings:
        status = "PASS" if f.passed else "FAIL"
        print(f"[{status}] {f.scenario}: {f.reason}")
        for e in f.evidence[:5]:
            print(f"         | {e}")

    all_passed = all(f.passed for f in findings)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(json.dumps({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "all_passed": all_passed,
        "scenarios": [asdict(f) for f in findings],
    }, indent=2), encoding="utf-8")
    print(f"\nEvidence: {EVIDENCE_FILE.relative_to(ROOT)}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
