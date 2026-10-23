
from pydantic import BaseModel, Field


class FailurePredictionRequest(BaseModel):
    pipeline_name: str = Field(min_length=1, max_length=255)
    pipeline_run_id: int | None = Field(default=None, gt=0)

    hour_of_day: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    expected_rows: int = Field(ge=0)
    source_freshness_lag_minutes: float = Field(ge=0)
    upstream_failures_24h: int = Field(ge=0)
    failures_last_10_runs: int = Field(ge=0)
    success_streak_before_run: int = Field(ge=0)
    schema_change_detected: int = Field(ge=0, le=1)
    null_rate_last_run: float = Field(ge=0, le=1)
    duplicate_rate_last_run: float = Field(ge=0, le=1)
    volume_change_pct_vs_7d_avg: float
    cpu_utilization_pct: float = Field(ge=0, le=100)
    memory_utilization_pct: float = Field(ge=0, le=100)
    concurrent_pipelines: int = Field(ge=0)
    is_weekend: int = Field(ge=0, le=1)


class FailurePredictionResponse(BaseModel):
    dataset_name: str
    failure_probability: float
    risk_level: str
    predicted_failure: bool
    decision_threshold: float
    model_version: str
    prediction_id: int | None = None
    pipeline_run_id: int | None = None
    predicted_at: str | None = None
