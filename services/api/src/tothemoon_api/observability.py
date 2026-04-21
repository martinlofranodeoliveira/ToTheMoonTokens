from __future__ import annotations

import logging
import os
import re
import threading
import time
import uuid
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from typing import Any, cast

import structlog
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

REQUEST_ID_HEADER = "X-Request-ID"


SENSITIVE_FIELD_PATTERN = re.compile(
    r"(token|secret|password|passwd|seed|private[_-]?key|api[_-]?key|acknowledg|authorization|bearer)",
    re.IGNORECASE,
)
REDACTED_PLACEHOLDER = "[REDACTED]"


def redact_sensitive_fields(
    _logger: Any, _method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """structlog processor that redacts values for keys matching sensitive patterns.

    Runs before the JSON renderer so no raw secret ever hits stdout.
    Nested dicts are walked recursively; lists/tuples are replaced wholesale
    if they look suspicious (we cannot redact opaque sequences selectively).
    """

    def _walk(value: Any, *, parent_key: str = "") -> Any:
        if isinstance(value, dict):
            return {
                key: (
                    REDACTED_PLACEHOLDER
                    if SENSITIVE_FIELD_PATTERN.search(str(key))
                    else _walk(sub, parent_key=str(key))
                )
                for key, sub in value.items()
            }
        if isinstance(value, (list, tuple)) and SENSITIVE_FIELD_PATTERN.search(parent_key):
            return REDACTED_PLACEHOLDER
        return value

    return {
        key: (
            REDACTED_PLACEHOLDER
            if SENSITIVE_FIELD_PATTERN.search(str(key))
            else _walk(value, parent_key=str(key))
        )
        for key, value in event_dict.items()
    }


SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


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
            cast(Any, redact_sensitive_fields),
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

RATE_LIMIT_REJECTIONS_TOTAL = Counter(
    "rate_limit_rejections_total",
    "Requests rejected by the in-memory rate limiter.",
    ["path"],
)


class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter.

    We intentionally keep this dependency-free: slowapi would pull in extra
    transitive deps (limits, redis stubs) for a two-endpoint use case. For a
    single-process API the sliding window is sufficient; if the service ever
    scales horizontally, swap the backing store for Redis.
    """

    def __init__(self) -> None:
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, *, key: str, scope: str, limit: int, window_seconds: float) -> bool:
        if limit <= 0 or window_seconds <= 0:
            return True
        now = time.monotonic()
        cutoff = now - window_seconds
        bucket_key = (scope, key)
        with self._lock:
            bucket = self._hits[bucket_key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limiter = InMemoryRateLimiter()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    client = request.client
    return client.host if client else "unknown"


def enforce_rate_limit(request: Request, *, limit: int, window_seconds: float) -> Response | None:
    """Returns a 429 response when the caller exceeds the budget, else None."""

    scope = request.url.path
    key = _client_key(request)
    if rate_limiter.allow(key=key, scope=scope, limit=limit, window_seconds=window_seconds):
        return None
    RATE_LIMIT_REJECTIONS_TOTAL.labels(path=scope).inc()
    get_logger().warning(
        "rate_limit_rejected",
        client=key,
        path=scope,
        limit=limit,
        window_seconds=window_seconds,
    )
    retry_after = max(1, int(window_seconds))
    return JSONResponse(
        status_code=429,
        content={
            "ok": False,
            "error": "rate_limited",
            "message": "Too many requests. Slow down and try again shortly.",
            "retry_after_seconds": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
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


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "").strip()
        request_id = incoming if 0 < len(incoming) <= 128 else uuid.uuid4().hex
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.clear_contextvars()
        response.headers[REQUEST_ID_HEADER] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response


def metrics_response() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def log_event(event: str, **fields: Any) -> None:
    get_logger().info(event, **fields)
