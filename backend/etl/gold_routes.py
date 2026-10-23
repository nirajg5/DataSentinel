
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.etl.gold_service import build_gold_tables

router = APIRouter(prefix="/etl", tags=["Gold ETL"])


@router.post("/gold/build")
def build_gold(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return build_gold_tables()
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        # Log the exception in production; avoid exposing
        # internal database details to API clients.
        raise HTTPException(
            status_code=500,
            detail="Gold ETL failed. Check the application logs.",
        ) from exc
