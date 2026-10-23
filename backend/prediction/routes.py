from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.prediction.schemas import (
    FailurePredictionRequest,
    FailurePredictionResponse,
)
from backend.prediction.evaluation import evaluate_predictions
from backend.prediction.service import get_prediction_history
from backend.prediction.service import predict_failure, load_model_artifacts

router = APIRouter(
    prefix="/predictions",
    tags=["Failure Prediction"],
)


@router.get("/failure/model-status")
def model_status(
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        _, metadata = load_model_artifacts()
        return {
            "available": True,
            "model_type": metadata.get("model_type"),
            "dataset_type": metadata.get("dataset_type"),
            "features": metadata.get("features"),
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/failure/{dataset_name}",
    response_model=FailurePredictionResponse,
)
def create_failure_prediction(
    dataset_name: str,
    request: FailurePredictionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    if dataset_name not in {
        "bronze_customers",
        "bronze_orders",
        "bronze_products",
    }:
        raise HTTPException(
            status_code=400,
            detail="Unsupported dataset name.",
        )

    try:
        return predict_failure(
        dataset_name=dataset_name,
        features={
        **request.model_dump(
            exclude={"pipeline_run_id"}
        ),
        "dataset_name": dataset_name,
       },
      db=db,
      pipeline_run_id=request.pipeline_run_id,
       )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failure prediction failed. Check application logs.",
        ) from exc


@router.get("/failure/{dataset_name}/history")
def prediction_history(
    dataset_name: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    if dataset_name not in {
        "bronze_customers",
        "bronze_orders",
        "bronze_products",
    }:
        raise HTTPException(
            status_code=400,
            detail="Unsupported dataset name.",
        )

    if not 1 <= limit <= 100:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 100.",
        )


    predictions = get_prediction_history(
    dataset_name=dataset_name,
    db=db,
    limit=limit,
    )

    return {
    "dataset_name": dataset_name,
    "count": len(predictions),
    "predictions": predictions,
}


@router.get("/evaluation")
def prediction_evaluation(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    return evaluate_predictions(db)


