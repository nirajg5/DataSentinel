from fastapi import APIRouter, Depends, HTTPException

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.etl.service import transform_bronze_to_silver


router = APIRouter(
    prefix="/etl",
    tags=["ETL"],
)


@router.post("/silver/{dataset_type}")
def run_silver_transformation(
    dataset_type: str,
    current_user=Depends(
        require_role(ADMIN, DATA_ENGINEER)
    ),
):
    try:
        return transform_bronze_to_silver(dataset_type)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Silver transformation failed",
        )