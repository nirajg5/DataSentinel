from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.dependencies import get_db
from backend.models.dataset import Dataset


router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("/")
def list_datasets(db: Session = Depends(get_db)):
    statement = select(Dataset).order_by(Dataset.dataset_name)

    datasets = db.scalars(statement).all()

    return [
        {
            "id": dataset.id,
            "dataset_name": dataset.dataset_name,
            "source_type": dataset.source_type,
            "source_name": dataset.source_name,
            "source_path": dataset.source_path,
            "owner": dataset.owner,
        }
        for dataset in datasets
    ]