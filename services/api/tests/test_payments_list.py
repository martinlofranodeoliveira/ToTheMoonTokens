from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)

def test_list_payment_intents():
    # Create an intent
    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_live_signal", "buyer_address": "0xBuyerListTest"},
    )
    assert intent_response.status_code == 200

    # List intents for that buyer
    list_response = client.get("/api/payments/intents?buyer_address=0xBuyerListTest")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert len(payload) >= 1
    assert payload[0]["buyer_address"] == "0xBuyerListTest"
