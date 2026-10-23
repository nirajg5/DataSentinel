
import time

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


HTTP_REQUESTS = Counter(
    "datasentinel_http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status_code"],
)

HTTP_REQUEST_DURATION = Histogram(
    "datasentinel_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "route"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = None

        try:
            response = await call_next(request)
            return response
        finally:
            duration = time.perf_counter() - start_time

            route_object = request.scope.get("route")
            route = getattr(route_object, "path", "unmatched")
            method = request.method

            status_code = (
                str(response.status_code)
                if response is not None
                else "500"
            )

            HTTP_REQUESTS.labels(
                method=method,
                route=route,
                status_code=status_code,
            ).inc()

            HTTP_REQUEST_DURATION.labels(
                method=method,
                route=route,
            ).observe(duration)



def prometheus_response():
    import logging

    from backend.monitoring.investigation_metrics import (
        refresh_investigation_metrics,
    )

    logger = logging.getLogger(__name__)

    try:
        refresh_investigation_metrics()
    except Exception:
        logger.exception(
            "Could not refresh investigation metrics from PostgreSQL"
        )

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
