import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def is_token_safe(token_address: str) -> bool:
    """
    Calls the TTM SaaS API to audit a token for honeypots and security risks.
    Returns True if the token is safe to trade, False if it's a scam or unsafe.
    """
    url = f"http://127.0.0.1:8010/api/v1/tokens/{token_address}/audit"
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        # We assume the API returns a boolean indicating safety, e.g., {"is_safe": true}
        # Or a risk score where we determine the threshold. 
        # Using a generic 'is_safe' or 'safe' key for the implementation.
        is_safe = data.get("is_safe", data.get("safe", False))
        
        if not is_safe:
            logger.warning(f"Token {token_address} is NOT safe to trade. Audit data: {data}")
            return False
            
        logger.info(f"Token {token_address} passed the security audit.")
        return True
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error communicating with TTM SaaS API for token {token_address}: {e}")
        # Default to False (unsafe) if the audit cannot be completed
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python auditor.py <token_address>")
        sys.exit(1)
        
    address = sys.argv[1]
    is_safe = is_token_safe(address)
    
    if is_safe:
        print(f"Result: Token {address} is SAFE.")
        sys.exit(0)
    else:
        print(f"Result: Token {address} is UNSAFE.")
        sys.exit(1)
