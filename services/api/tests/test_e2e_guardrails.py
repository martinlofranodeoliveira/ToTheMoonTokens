import json
from pathlib import Path

from playwright.sync_api import Page, expect


def test_dashboard_e2e_guardrails(page: Page):
    """
    Baseline E2E reproduzível para test IDs nas jornadas críticas.
    Garante validação automatizada e diagnóstico de falha.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    web_dir = repo_root / "apps" / "web"

    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))

    # Servir arquivos locais via Playwright router para burlar CORS do file://
    def route_static(route):
        filepath = web_dir / route.request.url.split("/")[-1]
        if not filepath.exists():
            filepath = web_dir / "index.html"
        content_type = "text/html" if filepath.suffix == ".html" else "application/javascript" if filepath.suffix == ".js" else "text/css"
        route.fulfill(
            status=200,
            content_type=content_type,
            body=filepath.read_bytes()
        )

    # Mocks da API
    def route_dashboard(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "app_name": "TestApp",
                "runtime_mode": "paper",
                "metrics": {
                    "net_profit": 150.0,
                    "total_return_pct": 5.0,
                    "max_drawdown_pct": 2.0,
                    "profit_factor": 1.5
                },
                "guardrails": {
                    "mode": "paper",
                    "can_submit_testnet_orders": False,
                    "reasons": ["Testnet locked."]
                },
                "connectors": {
                    "exchange": "binance",
                    "binance_base_url": "http://testnet",
                    "wallet_mode": "manual_only",
                    "metamask_ready": False
                },
                "strategies": [
                    {
                        "name": "Test Strategy",
                        "description": "Mocked",
                        "market_regime": "trend"
                    }
                ],
                "performance": {
                    "total_trades": 0,
                    "total_pnl": 0.0,
                    "win_rate_pct": 0.0,
                    "average_drawdown": 0.0,
                    "by_strategy": {}
                },
                "recent_trades": []
            })
        )

    def route_health(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "status": "online",
                "latency_ms": 10
            })
        )

    page.route("**/api/dashboard", route_dashboard)
    page.route("**/api/market/health", route_health)
    page.route("http://127.0.0.1:8010/*", route_static)

    # Acessar via HTTP para permitir module scripts (mockado pelo Playwright)
    page.goto("http://127.0.0.1:8010/index.html")

    page.wait_for_selector("#runtime-mode:not(:has-text('loading'))", timeout=5000)

    # Validação automatizada usando test IDs
    expect(page.get_by_test_id("runtime-mode")).to_be_visible()
    expect(page.get_by_test_id("runtime-mode")).to_have_text("paper")

    expect(page.get_by_test_id("guardrail-copy")).to_be_visible()
    
    expect(page.get_by_test_id("net-profit")).to_have_text("150.00 USD")
    expect(page.get_by_test_id("return-pct")).to_have_text("5.00%")
    expect(page.get_by_test_id("drawdown-pct")).to_have_text("2.00%")
    expect(page.get_by_test_id("profit-factor")).to_have_text("1.50")

    expect(page.get_by_test_id("refresh-button")).to_be_visible()
    expect(page.get_by_test_id("connect-wallet-button")).to_be_visible()
    
    expect(page.get_by_test_id("connector-list")).to_be_visible()
    expect(page.get_by_test_id("strategy-list")).to_be_visible()
    expect(page.get_by_test_id("guardrail-reasons")).to_be_visible()
    expect(page.get_by_test_id("aggregates-list")).to_be_visible()
    expect(page.get_by_test_id("journal-list")).to_be_visible()

