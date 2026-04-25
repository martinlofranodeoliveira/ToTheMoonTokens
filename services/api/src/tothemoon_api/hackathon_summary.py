from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from fastapi import APIRouter

from .arc import ping_arc_network
from .arc_adapter import get_arc_jobs
from .circle import circle_client
from .config import _ROOT_DIR, get_settings
from .demo_agent import list_demo_jobs
from .guards import connector_status, evaluate_guardrails
from .payments import get_catalog

router = APIRouter(prefix="/api/hackathon", tags=["hackathon"])

_FALLBACK_SUMMARY = {
    "total_attempted": 63,
    "successful": 63,
    "failed": 0,
    "total_elapsed_s": 214,
    "latency_p50_ms": 2485,
    "latency_p95_ms": 4733,
    "throughput_tx_per_min": 17.7,
    "total_usdc_moved": "0.063000",
    "amount_per_tx_usdc": "0.001",
}

_FALLBACK_TRANSACTIONS = [
    {
        "seq": 63,
        "from": "research_00",
        "to": "treasury",
        "amount_usdc": "0.001",
        "state": "COMPLETE",
        "tx_hash": "0x01092dbfccb591728a41e14a7716c2ac7aec4d93f478d725590a3a3988b13c9d",
        "elapsed_ms": 2455,
        "timestamp": "2026-04-23T00:01:38.102Z",
    },
    {
        "seq": 62,
        "from": "research_00",
        "to": "auditor",
        "amount_usdc": "0.001",
        "state": "COMPLETE",
        "tx_hash": "0xef9dcf454ce5e2763eaff4c49e57f0492defb7b206d646c5579e57ede9e0fb38",
        "elapsed_ms": 2471,
        "timestamp": "2026-04-23T00:01:35.242Z",
    },
    {
        "seq": 60,
        "from": "research_00",
        "to": "research_03",
        "amount_usdc": "0.001",
        "state": "COMPLETE",
        "tx_hash": "0x1ece4fd34bf75d7dbe4feab863846851e61ff3b64fedf4881a0051e14c50d7ec",
        "elapsed_ms": 2450,
        "timestamp": "2026-04-23T00:01:29.485Z",
    },
    {
        "seq": 49,
        "from": "research_00",
        "to": "treasury",
        "amount_usdc": "0.001",
        "state": "COMPLETE",
        "tx_hash": "0xfd5164fa11d5be54d676a3fcd09d055ce0dc1218ba5eb63c402944e0ded7fda6",
        "elapsed_ms": 2515,
        "timestamp": "2026-04-23T00:00:50.734Z",
    },
]

_FALLBACK_WALLETS = [
    {"name": "research_00", "address": "0xde618b260763a606e0380150d1338364f5ff3139"},
    {"name": "research_01", "address": "0x9a2b38ec283d3a51faa3095f0c0708c1b225462a"},
    {"name": "research_02", "address": "0x95140a42f10eb10551e076ed8d9a2ad8dcdb968d"},
    {"name": "research_03", "address": "0xbcdb0012b84dc6158c50b1e353b1627d2d4af8aa"},
    {"name": "consumer_01", "address": "0x28c83e915c791131678286977a42c6fe95da9a42"},
    {"name": "consumer_02", "address": "0xa82aa51fd19476a1dc37759b0fc41770f4a238d8"},
    {"name": "auditor", "address": "0x0201fdaa7b7298f351d8bc58cb045abe7089bb01"},
    {"name": "treasury", "address": "0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f"},
]

_TRACKS = [
    "Agent-to-Agent Payment Loop",
    "Per-API Monetization Engine",
    "Real-Time Micro-Commerce Flow",
]


def _latest_evidence_path() -> Path | None:
    evidence_dir = _ROOT_DIR / "ops" / "evidence"
    candidates = sorted(evidence_dir.glob("nanopayments-batch-*.json"))
    return candidates[-1] if candidates else None


def _load_latest_evidence() -> tuple[Path | None, dict[str, Any] | None]:
    evidence_path = _latest_evidence_path()
    if evidence_path is None:
        return None, None
    try:
        payload = json.loads(evidence_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return evidence_path, None
    if not isinstance(payload, dict):
        return evidence_path, None
    return evidence_path, payload


def _wallet_inventory(evidence: dict[str, Any] | None) -> list[dict[str, str]]:
    if circle_client.wallets_loaded and circle_client.wallets_by_role:
        live_wallets: list[dict[str, str]] = []
        for role, wallet in circle_client.wallets_by_role.items():
            name = role.strip().lower()
            address = str(wallet.get("address", "")).strip()
            if name and address:
                live_wallets.append({"name": name, "address": address})
        if live_wallets:
            return live_wallets

    if not evidence:
        return [wallet.copy() for wallet in _FALLBACK_WALLETS]

    wallets: list[dict[str, str]] = []
    source = evidence.get("source")
    if isinstance(source, dict):
        name = str(source.get("name", "")).strip()
        address = str(source.get("address", "")).strip()
        if name and address:
            wallets.append({"name": name, "address": address})

    destinations = evidence.get("destinations")
    if isinstance(destinations, list):
        for item in destinations:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            address = str(item.get("address", "")).strip()
            if name and address:
                wallets.append({"name": name, "address": address})
    return wallets or [wallet.copy() for wallet in _FALLBACK_WALLETS]


def _margin_snapshot(total_attempted: int, total_usdc_moved: float) -> dict[str, Any]:
    eth_l1_gas_per_tx = 0.50
    generic_l2_gas_per_tx = 0.003
    eth_l1_counterfactual_gas = round(total_attempted * eth_l1_gas_per_tx, 2)
    generic_l2_counterfactual_gas = round(total_attempted * generic_l2_gas_per_tx, 3)
    overhead_multiple = round(
        (eth_l1_counterfactual_gas / total_usdc_moved) if total_usdc_moved > 0 else 0.0,
        1,
    )
    return {
        "arc_total_value_usdc": round(total_usdc_moved, 6),
        "eth_l1_counterfactual_gas_usd": eth_l1_counterfactual_gas,
        "generic_l2_counterfactual_gas_usd": generic_l2_counterfactual_gas,
        "eth_l1_overhead_multiple": overhead_multiple,
        "explanation": (
            "The same batch would burn far more in traditional gas than the value moved. "
            "Arc keeps per-action economics viable."
        ),
    }


@router.get("/summary")
def get_hackathon_summary() -> dict[str, Any]:
    settings = get_settings()
    evidence_path, evidence = _load_latest_evidence()
    summary = cast(
        dict[str, Any],
        (
            evidence.get("summary")
            if isinstance(evidence, dict) and isinstance(evidence.get("summary"), dict)
            else _FALLBACK_SUMMARY
        ),
    )
    transactions = cast(
        list[dict[str, Any]],
        (
            evidence.get("transactions")
            if isinstance(evidence, dict) and isinstance(evidence.get("transactions"), list)
            else _FALLBACK_TRANSACTIONS
        ),
    )
    wallets = _wallet_inventory(evidence)
    connectors = connector_status(settings)

    total_attempted = int(summary.get("total_attempted", len(transactions)))
    successful = int(summary.get("successful", total_attempted))
    failed = int(summary.get("failed", 0))
    total_usdc_moved = float(summary.get("total_usdc_moved", 0.0))
    generated_at = (
        str(evidence.get("generated_at"))
        if isinstance(evidence, dict) and evidence.get("generated_at")
        else "2026-04-23T00:01:38.506Z"
    )
    wallet_set_id = (
        str(evidence.get("wallet_set_id"))
        if isinstance(evidence, dict) and evidence.get("wallet_set_id")
        else (settings.circle_wallet_set_id or None)
    )
    latest_transactions = list(reversed(transactions[-8:])) if transactions else []
    treasury_address = connectors.treasury_address or next(
        (wallet["address"] for wallet in wallets if wallet["name"] == "treasury"),
        None,
    )

    return {
        "ok": True,
        "project": "TTM Agent Market",
        "tracks": _TRACKS,
        "evidence_file": (
            str(evidence_path.relative_to(_ROOT_DIR))
            if evidence_path is not None
            else "repo-fallback"
        ),
        "proof": {
            "wallet_set_id": wallet_set_id,
            "generated_at": generated_at,
            "transactions_total": total_attempted,
            "transactions_successful": successful,
            "transactions_failed": failed,
            "success_rate_pct": round((successful / total_attempted) * 100.0, 2)
            if total_attempted
            else 0.0,
            "latency_p50_ms": int(summary.get("latency_p50_ms", 0)),
            "latency_p95_ms": int(summary.get("latency_p95_ms", 0)),
            "throughput_tx_per_min": float(summary.get("throughput_tx_per_min", 0.0)),
            "total_usdc_moved": total_usdc_moved,
            "amount_per_tx_usdc": float(summary.get("amount_per_tx_usdc", 0.0)),
            "sample_tx_hash": latest_transactions[0]["tx_hash"] if latest_transactions else None,
            "explorer_base_url": "https://testnet.arcscan.app",
        },
        "margin": _margin_snapshot(total_attempted, total_usdc_moved),
        "arc": ping_arc_network(),
        "circle": {
            "wallet_set_id": wallet_set_id,
            "wallets_configured": len(wallets) if wallets else connectors.wallets_configured,
            "wallets_loaded": connectors.wallets_loaded,
            "treasury_address": treasury_address,
            "wallets": wallets,
        },
        "guardrails": evaluate_guardrails(settings).model_dump(mode="json"),
        "connectors": connectors.model_dump(mode="json"),
        "catalog": [item.model_dump(mode="json") for item in get_catalog()],
        "demo_jobs": [job.model_dump(mode="json") for job in list_demo_jobs()],
        "transactions": latest_transactions,
        "arc_jobs": [job.model_dump(mode="json") for job in get_arc_jobs(limit=5)],
    }
