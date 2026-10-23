
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.freshness.service import check_dataset_freshness

router = APIRouter(
    prefix="/freshness",
    tags=["Freshness Monitoring"],
)


@router.post("/check/{dataset_name}")
def check_freshness(
    dataset_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return check_dataset_freshness(dataset_name)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Freshness check failed. Check application logs.",
        ) from exc
