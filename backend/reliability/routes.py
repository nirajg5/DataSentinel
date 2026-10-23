
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.reliability.service import calculate_reliability

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reliability",
    tags=["Reliability Scoring"],
)


@router.post("/calculate/{dataset_type}")
def calculate_dataset_reliability(
    dataset_type: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return calculate_reliability(dataset_type)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception(
            "Reliability calculation failed for dataset_type=%s",
            dataset_type,
        )
        raise HTTPException(
            status_code=500,
            detail="Reliability calculation failed. Check application logs.",
        ) from exc
