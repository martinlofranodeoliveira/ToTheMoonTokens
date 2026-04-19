from __future__ import annotations

import logging
import os
import time
from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


_CONFIGURED = False


def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    _CONFIGURED = True

    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(level=level, format="%(message)s")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    configure_logging()
    return structlog.get_logger(name or "tothemoon_api")


HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests handled by the API.",
    ["method", "path", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds.",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

BACKTESTS_RUN_TOTAL = Counter(
    "backtests_run_total",
    "Total backtests executed.",
    ["strategy_id", "edge_status"],
)

GUARDRAIL_EVALUATIONS_TOTAL = Counter(
    "guardrail_evaluations_total",
    "Guardrail evaluations by outcome.",
    ["mode", "can_submit_testnet"],
)

LIVE_ARM_ATTEMPTS_TOTAL = Counter(
    "live_arm_attempts_total",
    "Attempts to arm testnet live mode.",
    ["allowed"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        route = request.scope.get("route")
        path = getattr(route, "path", None) or request.url.path
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method, path=path, status=str(response.status_code)
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(method=request.method, path=path).observe(elapsed)
        return response


def metrics_response() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def log_event(event: str, **fields: Any) -> None:
    get_logger().info(event, **fields)
