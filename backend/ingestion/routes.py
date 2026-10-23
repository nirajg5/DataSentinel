
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.ingestion.service import ingest_dataset
from backend.models.dataset import Dataset
from backend.prediction.schemas import FailurePredictionRequest


router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/dataset")
def ingest_registered_dataset(
    dataset_name: str,
    prediction_features: FailurePredictionRequest | None = Body(
        default=None
    ),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(ADMIN, DATA_ENGINEER)
    ),
):
    dataset = db.scalar(
        select(Dataset).where(
            Dataset.dataset_name == dataset_name
        )
    )

    if dataset is None:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    try:
        return ingest_dataset(
            db=db,
            dataset=dataset,
            prediction_features=prediction_features,
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Ingestion failed; inspect the server logs",
        ) from error
