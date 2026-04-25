from unittest.mock import patch

from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)


@patch(
    "tothemoon_api.hackathon_summary.ping_arc_network",
    return_value={
        "status": "online",
        "chain_id": 5042002,
        "url": "https://rpc.testnet.arc.network",
    },
)
def test_hackathon_summary_exposes_judge_facing_proof(_mock_arc_health):
    response = client.get("/api/hackathon/summary")
    assert response.status_code == 200
    payload = response.json()

    assert payload["ok"] is True
    assert payload["project"] == "TTM Agent Market"
    assert payload["proof"]["transactions_total"] >= 63
    assert payload["proof"]["transactions_successful"] >= 63
    assert payload["proof"]["transactions_listed"] == len(payload["transactions"])
    assert len(payload["transactions"]) >= 63
    assert len(payload["latest_transactions"]) <= 8
    assert payload["transactions"][0]["seq"] >= payload["transactions"][-1]["seq"]
    assert all(item["tx_hash"].startswith("0x") for item in payload["transactions"])
    assert all(item["explorer_url"].startswith("https://testnet.arcscan.app/tx/") for item in payload["transactions"])
    assert payload["proof"]["throughput_tx_per_min"] >= 1
    assert payload["proof"]["sample_tx_hash"].startswith("0x")
    assert payload["circle"]["wallet_set_id"]
    assert payload["connectors"]["settlement_network"] == "arc_testnet"
    assert payload["connectors"]["settlement_auth_mode"] in {"manual", "programmatic"}
    assert "agent_chat_ready" in payload["connectors"]
    assert payload["margin"]["eth_l1_counterfactual_gas_usd"] > payload["proof"]["total_usdc_moved"]
    assert all(0 < item["price_usd"] <= 0.01 for item in payload["catalog"])
