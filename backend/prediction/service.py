import json
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.models.pipeline_run import PipelineRun
from backend.models.failure_prediction import FailurePrediction


ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"


@lru_cache(maxsize=1)
def load_model_artifacts():
    model_path = ARTIFACT_DIR / "pipeline_failure_model.joblib"
    metadata_path = ARTIFACT_DIR / "pipeline_failure_metadata.json"

    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(
            "Failure prediction artifacts are missing. "
            "Train the model and copy its artifacts into "
            "backend/prediction/artifacts."
        )

    model = joblib.load(model_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

    return model, metadata



def predict_failure(
    dataset_name: str,
    features: dict,
    db: Session,
    pipeline_run_id: int | None = None,
) -> dict:
    model, metadata = load_model_artifacts()

    # If supplied, validate the pipeline run before making a prediction.
    pipeline_run = None

    if pipeline_run_id is not None:
        pipeline_run = (
            db.query(PipelineRun)
            .filter(PipelineRun.id == pipeline_run_id)
            .first()
        )

        if pipeline_run is None:
            raise ValueError(
                f"Pipeline run {pipeline_run_id} does not exist."
            )

        if pipeline_run.dataset_name != dataset_name:
            raise ValueError(
                "Pipeline run dataset does not match the prediction dataset."
            )

        if pipeline_run.status != "STARTED":
            raise ValueError(
                "Predictions can only be linked to pipeline runs "
                "whose status is STARTED."
            )

        if pipeline_run.pipeline_name != features.get("pipeline_name"):
            raise ValueError(
                "Pipeline run name does not match the prediction request."
            )

    expected_features = metadata["features"]
    missing = set(expected_features) - set(features)

    if missing:
        raise ValueError(
            f"Missing prediction features: {sorted(missing)}"
        )

    row = {name: features[name] for name in expected_features}
    input_frame = pd.DataFrame([row], columns=expected_features)

    probability = float(model.predict_proba(input_frame)[0, 1])
    threshold = float(metadata["decision_threshold"])
    predicted_failure = probability >= threshold

    if probability >= 0.70:
        risk_level = "HIGH"
    elif probability >= 0.35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    record = FailurePrediction(
        dataset_name=dataset_name,
        pipeline_run_id=pipeline_run_id,
        failure_probability=probability,
        risk_level=risk_level,
        predicted_failure=predicted_failure,
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        raise

    return {
        "dataset_name": dataset_name,
        "failure_probability": round(probability, 4),
        "risk_level": risk_level,
        "predicted_failure": predicted_failure,
        "decision_threshold": threshold,
        "model_version": "random-forest-v1",
        "prediction_id": record.id,
        "pipeline_run_id": record.pipeline_run_id,
        "predicted_at": record.predicted_at.isoformat(),
    }


def get_prediction_history(
    dataset_name: str,
    db: Session,
    limit: int = 20,
) -> list[dict]:
    records = (
        db.query(FailurePrediction)
        .filter(FailurePrediction.dataset_name == dataset_name)
        .order_by(FailurePrediction.predicted_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": record.id,
            "dataset_name": record.dataset_name,
            "failure_probability": round(
                record.failure_probability, 4
            ),
            "risk_level": record.risk_level,
            "predicted_failure": record.predicted_failure,
            "predicted_at": record.predicted_at.isoformat(),
        }
        for record in records
    ]
