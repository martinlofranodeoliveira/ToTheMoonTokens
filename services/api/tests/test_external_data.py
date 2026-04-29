# services/api/tests/test_external_data.py
from tothemoon_api.external.security import get_token_security_audit
from tothemoon_api.external.market import get_token_market_data

def test_get_token_security_audit():
    audit = get_token_security_audit("0xSAFE")
    assert audit["is_honeypot"] is False
    assert audit["liquidity_locked_pct"] > 0
    
    audit_scam = get_token_security_audit("0xSCAM")
    assert audit_scam["is_honeypot"] is True

def test_get_token_market_data():
    market = get_token_market_data("0xABC")
    assert "price" in market
    assert "volatility_index" in market
