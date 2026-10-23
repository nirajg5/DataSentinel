
from types import SimpleNamespace
from unittest.mock import MagicMock

import pandas as pd
import pytest

import backend.ingestion.service as service


def make_dataset():
    return SimpleNamespace(
        dataset_name="bronze_customers",
        source_type="CSV",
        source_path="data/source/customers.csv",
    )


def make_prediction_features():
    values = {
        "pipeline_name": "bronze_csv_ingestion",
        "hour_of_day": 10,
        "day_of_week": 3,
        "expected_rows": 200,
        "source_freshness_lag_minutes": 5,
        "upstream_failures_24h": 0,
        "failures_last_10_runs": 0,
        "success_streak_before_run": 5,
        "schema_change_detected": 0,
        "null_rate_last_run": 0.01,
        "duplicate_rate_last_run": 0.01,
        "volume_change_pct_vs_7d_avg": 0.05,
        "cpu_utilization_pct": 35,
        "memory_utilization_pct": 45,
        "concurrent_pipelines": 1,
        "is_weekend": 0,
    }
    return SimpleNamespace(
        pipeline_name="bronze_csv_ingestion",
        model_dump=lambda **kwargs: values.copy(),
    )


def setup_ingestion_mocks(monkeypatch):
    dataframe = pd.DataFrame(
        {
            "customer_id": [1, 2],
            "customer_name": ["A", "B"],
            "email": ["a@example.com", "b@example.com"],
            "city": ["Pune", "Mumbai"],
            "country": ["India", "India"],
            "created_at": ["2026-10-20", "2026-10-21"],
        }
    )

    run = SimpleNamespace(
        id=101,
        run_id="test-run-101",
        pipeline_name="bronze_csv_ingestion",
        dataset_name="bronze_customers",
    )

    monkeypatch.setattr(
        service,
        "read_csv_file",
        lambda path: dataframe,
    )
    monkeypatch.setattr(
        service,
        "create_pipeline_run",
        lambda **kwargs: run,
    )
    monkeypatch.setattr(
        service,
        "validate_dataframe",
        lambda *args: None,
    )
    monkeypatch.setattr(
        service,
        "finish_pipeline_run",
        MagicMock(),
    )

    # Avoid inspecting or writing to the real database.
    inspector = MagicMock()
    inspector.has_table.return_value = True
    monkeypatch.setattr(service, "inspect", lambda engine: inspector)

    monkeypatch.setattr(
        pd.DataFrame,
        "to_sql",
        MagicMock(),
    )

    return dataframe, run


def test_ingestion_without_prediction_succeeds(monkeypatch):
    dataframe, run = setup_ingestion_mocks(monkeypatch)
    prediction = MagicMock()
    monkeypatch.setattr(service, "predict_failure", prediction)

    result = service.ingest_dataset(
        MagicMock(),
        make_dataset(),
    )

    assert result["status"] == "SUCCESS"
    assert result["pipeline_run_id"] == run.id
    assert result["rows_ingested"] == len(dataframe)
    assert result["prediction"] is None
    assert result["prediction_error"] is None
    prediction.assert_not_called()


def test_ingestion_saves_linked_prediction(monkeypatch):
    _, run = setup_ingestion_mocks(monkeypatch)
    prediction_result = {
        "prediction_id": 12,
        "pipeline_run_id": run.id,
        "predicted_failure": False,
    }
    prediction = MagicMock(return_value=prediction_result)
    monkeypatch.setattr(service, "predict_failure", prediction)

    result = service.ingest_dataset(
        MagicMock(),
        make_dataset(),
        prediction_features=make_prediction_features(),
    )

    assert result["status"] == "SUCCESS"
    assert result["prediction"] == prediction_result
    assert result["prediction_error"] is None

    kwargs = prediction.call_args.kwargs
    assert kwargs["pipeline_run_id"] == run.id
    assert kwargs["dataset_name"] == "bronze_customers"


def test_prediction_error_does_not_stop_ingestion(monkeypatch):
    _, run = setup_ingestion_mocks(monkeypatch)
    db = MagicMock()
    monkeypatch.setattr(
        service,
        "predict_failure",
        MagicMock(side_effect=RuntimeError("Model unavailable")),
    )

    result = service.ingest_dataset(
        db,
        make_dataset(),
        prediction_features=make_prediction_features(),
    )

    assert result["status"] == "SUCCESS"
    assert result["pipeline_run_id"] == run.id
    assert result["prediction"] is None
    assert result["prediction_error"] == "Model unavailable"
    db.rollback.assert_called_once()


def test_ingestion_failure_marks_run_failed(monkeypatch):
    _, run = setup_ingestion_mocks(monkeypatch)
    monkeypatch.setattr(
        service,
        "validate_dataframe",
        MagicMock(side_effect=ValueError("Invalid CSV schema")),
    )

    with pytest.raises(ValueError, match="Invalid CSV schema"):
        service.ingest_dataset(
            MagicMock(),
            make_dataset(),
        )

    service.finish_pipeline_run.assert_called_once()
    kwargs = service.finish_pipeline_run.call_args.kwargs
    assert kwargs["run"] == run
    assert kwargs["status"] == "FAILED"
    assert kwargs["error_message"] == "Invalid CSV schema"



def test_successful_ingestion_refreshes_freshness(monkeypatch):
    setup_ingestion_mocks(monkeypatch)
    monkeypatch.setattr(service, "predict_failure", MagicMock())

    freshness_check = MagicMock(return_value={
        "dataset_name": "bronze_customers",
        "freshness_status": "FRESH",
        "freshness_score": 100.0,
    })
    monkeypatch.setattr(service, "check_dataset_freshness", freshness_check)

    result = service.ingest_dataset(MagicMock(), make_dataset())

    assert result["status"] == "SUCCESS"
    freshness_check.assert_called_once_with("bronze_customers")


def test_freshness_check_failure_does_not_fail_ingestion(monkeypatch):
    setup_ingestion_mocks(monkeypatch)
    monkeypatch.setattr(service, "predict_failure", MagicMock())
    monkeypatch.setattr(
        service,
        "check_dataset_freshness",
        MagicMock(side_effect=RuntimeError("Freshness DB unavailable")),
    )

    result = service.ingest_dataset(MagicMock(), make_dataset())

    assert result["status"] == "SUCCESS"
    service.finish_pipeline_run.assert_called_once()
    assert service.finish_pipeline_run.call_args.kwargs["status"] == "SUCCESS"


def test_failed_ingestion_does_not_refresh_freshness(monkeypatch):
    setup_ingestion_mocks(monkeypatch)
    monkeypatch.setattr(service, "predict_failure", MagicMock())
    monkeypatch.setattr(
        service,
        "check_dataset_freshness",
        MagicMock(),
    )
    monkeypatch.setattr(
        service,
        "validate_dataframe",
        MagicMock(side_effect=ValueError("Invalid CSV schema")),
    )

    with pytest.raises(ValueError, match="Invalid CSV schema"):
        service.ingest_dataset(MagicMock(), make_dataset())

    service.check_dataset_freshness.assert_not_called()
    assert service.finish_pipeline_run.call_args.kwargs["status"] == "FAILED"
