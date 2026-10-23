
from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from backend.core.config import settings
from backend.database.database import engine
from backend.auth.routes import router as auth_router
from backend.api.datasets import router as datasets_router
from backend.ingestion.routes import router as ingestion_router
from backend.etl.gold_routes import router as gold_router
from backend.etl.routes import router as etl_router
from backend.quality.routes import router as quality_router
from backend.freshness.routes import router as freshness_router
from backend.reliability.routes import router as reliability_router
from backend.incidents.routes import router as incidents_router
from backend.ai.routes import router as ai_router
from backend.rag.routes import router as rag_router
from backend.agents.routes import router as agent_router
from backend.monitoring.prometheus_metrics import (
    PrometheusMiddleware,
    prometheus_response,
)
from backend.pipeline_runs.routes import router as pipeline_runs_router
from backend.prediction.routes import router as prediction_router

# 1. Create the FastAPI application first
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Enterprise data reliability, observability, "
        "advanced RAG, and agentic AI platform"
    ),
)

app.add_middleware(PrometheusMiddleware)
app.add_api_route(
    "/metrics",
    prometheus_response,
    methods=["GET"],
    include_in_schema=False,
)

# 2. Register authentication routes after creating the app
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(ingestion_router)
app.include_router(etl_router)
app.include_router(gold_router)
app.include_router(quality_router)
app.include_router(freshness_router)
app.include_router(reliability_router)
app.include_router(incidents_router)
app.include_router(ai_router)
app.include_router(rag_router)
app.include_router(agent_router)
app.include_router(prediction_router)
app.include_router(pipeline_runs_router)
# 3. Root endpoint
@app.get("/")
def home():
    return {
        "project": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# 4. Application health check
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
    }


# 5. Database health check
@app.get("/health/database")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {"database": "connected"}

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection unavailable",
        )
