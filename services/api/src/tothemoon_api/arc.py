import httpx
import structlog
from tothemoon_api.config import get_settings

log = structlog.get_logger(__name__)

def ping_arc_network() -> dict[str, object]:
    settings = get_settings()
    url = settings.arc_rpc_url
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_chainId",
        "params": [],
        "id": 1
    }
    
    try:
        with httpx.Client(timeout=3.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return {
                "ok": True,
                "chain_id": int(data.get("result", "0"), 16) if isinstance(data.get("result"), str) else data.get("result"),
                "url": url,
                "status": "connected"
            }
    except Exception as exc:
        log.warning("arc_network_ping_failed", error=str(exc), url=url)
        return {
            "ok": False,
            "error": str(exc),
            "url": url,
            "status": "degraded"
        }
