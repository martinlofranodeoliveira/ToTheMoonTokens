# services/api/src/tothemoon_api/external/security.py
def get_token_security_audit(token_address: str) -> dict:
    # Mock implementation of TokenSniffer / GoPlus
    is_honeypot = token_address.lower().endswith("scam")
    return {
        "token_address": token_address,
        "is_honeypot": is_honeypot,
        "liquidity_locked_pct": 0.0 if is_honeypot else 95.5,
        "contract_verified": not is_honeypot,
        "risk_score": 99 if is_honeypot else 15
    }
