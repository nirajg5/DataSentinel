
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.quality.service import check_dataset

router = APIRouter(prefix="/quality", tags=["Data Quality"])


@router.post("/check/{dataset_type}")
def run_quality_checks(
    dataset_type: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return check_dataset(dataset_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Quality checks failed. Check application logs.",
        ) from exc
