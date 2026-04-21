import httpx
import pytest
from tothemoon_api.arc import ping_arc_network
from unittest.mock import patch

def test_ping_arc_network_success():
    with patch("tothemoon_api.arc.httpx.Client") as mock_client:
        mock_post = mock_client.return_value.__enter__.return_value.post
        mock_post.return_value.json.return_value = {"result": "0x4ce12"}  # 314898 in hex
        mock_post.return_value.raise_for_status.return_value = None
        
        result = ping_arc_network()
        
        assert result["ok"] is True
        assert result["chain_id"] == 314898
        assert result["status"] == "connected"

def test_ping_arc_network_failure():
    with patch("tothemoon_api.arc.httpx.Client") as mock_client:
        mock_post = mock_client.return_value.__enter__.return_value.post
        mock_post.side_effect = httpx.RequestError("Connection failed")
        
        result = ping_arc_network()
        
        assert result["ok"] is False
        assert result["status"] == "degraded"
        assert "error" in result
