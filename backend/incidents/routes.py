
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.incidents.service import detect_incidents
from fastapi import Query

from backend.incidents.pipeline_monitor import (
    detect_pipeline_failures,
)
from backend.incidents.lifecycle import (
    list_incidents,
    resolve_incident,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post("/detect/{dataset_name}")
def detect_dataset_incidents(
    dataset_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return detect_incidents(dataset_name)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Incident detection failed. Check application logs.",
        ) from exc
    

@router.post("/detect-pipeline-failures/{dataset_name}")
def detect_failed_pipelines(
    dataset_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return detect_pipeline_failures(dataset_name)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Pipeline monitoring failed. Check application logs.",
        ) from exc


@router.get("/")
def get_incidents(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return list_incidents(status)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve incidents.",
        ) from exc


@router.patch("/{incident_code}/resolve")
def resolve_existing_incident(
    incident_code: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return resolve_incident(incident_code)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not resolve incident.",
        ) from exc

