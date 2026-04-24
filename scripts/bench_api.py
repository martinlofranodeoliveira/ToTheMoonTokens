"""Simple API benchmark for the hackathon pitch.

Runs sequential and concurrent loads against critical endpoints and reports
p50/p95/p99 latency plus TPS. No external deps beyond httpx.

Usage:
    python scripts/bench_api.py [--base-url http://127.0.0.1:8010] [--n 200] [--label after]
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import time
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass
class Result:
    label: str
    endpoint: str
    n: int
    concurrency: int
    ok_count: int
    err_count: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    max_ms: float
    wall_s: float
    tps: float


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    k = max(0, min(len(sorted_values) - 1, int(round((pct / 100) * (len(sorted_values) - 1)))))
    return sorted_values[k]


def _run_one(client: httpx.Client, method: str, path: str, body: Any) -> tuple[bool, float]:
    start = time.perf_counter()
    try:
        if method == "GET":
            r = client.get(path)
        else:
            r = client.post(path, json=body or {})
        ok = 200 <= r.status_code < 400
    except Exception:
        ok = False
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    return ok, elapsed_ms


def bench(
    base_url: str,
    label: str,
    method: str,
    path: str,
    body: Any = None,
    n: int = 200,
    concurrency: int = 8,
    timeout_s: float = 20.0,
) -> Result:
    client = httpx.Client(base_url=base_url, timeout=timeout_s)
    try:
        # Warmup
        for _ in range(3):
            _run_one(client, method, path, body)

        samples: list[float] = []
        ok_count = 0
        err_count = 0
        wall_start = time.perf_counter()

        if concurrency == 1:
            for _ in range(n):
                ok, ms = _run_one(client, method, path, body)
                samples.append(ms)
                ok_count += int(ok)
                err_count += int(not ok)
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as ex:
                futures = [ex.submit(_run_one, client, method, path, body) for _ in range(n)]
                for fut in concurrent.futures.as_completed(futures):
                    ok, ms = fut.result()
                    samples.append(ms)
                    ok_count += int(ok)
                    err_count += int(not ok)

        wall = time.perf_counter() - wall_start
    finally:
        client.close()

    samples.sort()
    tps = n / wall if wall > 0 else 0.0
    return Result(
        label=label,
        endpoint=f"{method} {path}",
        n=n,
        concurrency=concurrency,
        ok_count=ok_count,
        err_count=err_count,
        p50_ms=_percentile(samples, 50),
        p95_ms=_percentile(samples, 95),
        p99_ms=_percentile(samples, 99),
        max_ms=max(samples) if samples else 0.0,
        wall_s=wall,
        tps=tps,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:8010")
    ap.add_argument("--label", default="run")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--json", action="store_true", help="emit JSON results")
    args = ap.parse_args()

    endpoints: list[tuple[str, str, Any]] = [
        ("GET", "/health", None),
        ("GET", "/api/dashboard", None),
        ("GET", "/api/hackathon/summary", None),
        ("POST", "/api/demo/jobs/request", {"artifact_type": "delivery_packet"}),
    ]

    results: list[Result] = []
    for method, path, body in endpoints:
        # Sequential
        r_seq = bench(
            args.base_url,
            args.label,
            method,
            path,
            body=body,
            n=max(30, args.n // 4),
            concurrency=1,
        )
        results.append(r_seq)
        # Concurrent
        r_con = bench(
            args.base_url,
            args.label,
            method,
            path,
            body=body,
            n=args.n,
            concurrency=args.concurrency,
        )
        results.append(r_con)

    if args.json:
        print(json.dumps([r.__dict__ for r in results], indent=2))
        return

    print(f"\n== bench[{args.label}]  base={args.base_url}  n={args.n}  conc={args.concurrency} ==\n")
    header = (
        f"{'endpoint':<38} {'conc':>4} {'n':>4} {'ok':>4} {'err':>3} "
        f"{'p50':>7} {'p95':>7} {'p99':>7} {'max':>7} {'tps':>7}"
    )
    print(header)
    print("-" * len(header))
    for r in results:
        print(
            f"{r.endpoint:<38} {r.concurrency:>4} {r.n:>4} {r.ok_count:>4} {r.err_count:>3} "
            f"{r.p50_ms:>6.1f}m {r.p95_ms:>6.1f}m {r.p99_ms:>6.1f}m {r.max_ms:>6.1f}m {r.tps:>6.1f}"
        )


if __name__ == "__main__":
    main()
