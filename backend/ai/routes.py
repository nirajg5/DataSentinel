
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.ai.service import analyze_demo, analyze_incident

router = APIRouter(prefix="/ai-analysis", tags=["AI Analysis"])


class DemoEvidence(BaseModel):
    dataset_name: str = Field(min_length=1, max_length=100)
    incident_type: str = Field(min_length=1, max_length=100)
    severity: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=3000)
    pipeline_status: str | None = None
    error_message: str | None = None


@router.post("/demo")
def run_demo_analysis(
    payload: DemoEvidence,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return analyze_demo(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Groq analysis failed. Check server logs and API configuration.",
        ) from exc


@router.post("/{incident_code}")
def run_incident_analysis(
    incident_code: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return analyze_incident(incident_code)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Incident analysis failed. Check server logs.",
        ) from exc
