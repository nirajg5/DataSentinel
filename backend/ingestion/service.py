
import logging
from uuid import uuid4

import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from backend.database.database import engine
from backend.ingestion.csv_reader import read_csv_file
from backend.ingestion.tracker import (
    create_pipeline_run,
    finish_pipeline_run,
)
from backend.ingestion.validation import validate_dataframe
from backend.models.dataset import Dataset
from backend.prediction.schemas import FailurePredictionRequest
from backend.freshness.service import check_dataset_freshness
from backend.prediction.service import predict_failure


logger = logging.getLogger(__name__)


def ingest_dataset(
    db: Session,
    dataset: Dataset,
    prediction_features: FailurePredictionRequest | None = None,
) -> dict:
    if dataset.source_type != "CSV":
        raise ValueError("Only CSV datasets are supported")

    if not dataset.source_path:
        raise ValueError("Dataset source path is not configured")

    dataset_type = dataset.dataset_name.removeprefix("bronze_")

    if dataset_type not in {"customers", "products", "orders"}:
        raise ValueError("Unsupported Bronze dataset")

    dataframe = read_csv_file(dataset.source_path)

    run = create_pipeline_run(
        db=db,
        pipeline_name="bronze_csv_ingestion",
        dataset_name=dataset.dataset_name,
        run_id=str(uuid4()),
        source_file=dataset.source_path,
        rows_read=len(dataframe),
    )

    prediction_result = None
    prediction_error = None

    # Predict before validation and data loading, while the run is STARTED.
    if prediction_features is not None:
        try:
            if prediction_features.pipeline_name != run.pipeline_name:
                raise ValueError(
                    "Prediction pipeline_name must match "
                    "the ingestion pipeline."
                )

            prediction_result = predict_failure(
                dataset_name=dataset.dataset_name,
                features={
                    **prediction_features.model_dump(
                        exclude={"pipeline_run_id"}
                    ),
                    "dataset_name": dataset.dataset_name,
                },
                db=db,
                pipeline_run_id=run.id,
            )

        except Exception as error:
            # Prediction is optional: prediction failure must not
            # prevent ingestion from continuing.
            db.rollback()
            prediction_error = str(error)

            logger.exception(
                "Failure prediction failed for pipeline run %s",
                run.id,
            )

    try:
        validate_dataframe(dataframe, dataset_type)

        dataframe = dataframe.copy()
        target_table = dataset.dataset_name

        # Create the Bronze table if absent; never replace an existing table.
        if not inspect(engine).has_table(target_table):
            dataframe.iloc[0:0].to_sql(
                target_table,
                con=engine,
                if_exists="fail",
                index=False,
            )

        dataframe.to_sql(
            target_table,
            con=engine,
            if_exists="append",
            index=False,
        )

        finish_pipeline_run(
            db=db,
            run=run,
            status="SUCCESS",
            rows_processed=len(dataframe),
            rows_loaded=len(dataframe),
        )

        try:
            check_dataset_freshness(target_table)
        except Exception:
            # Freshness monitoring must not invalidate successful ingestion.
            logger.exception(
                "Freshness check failed after successful ingestion for %s",
                target_table,
            )

        return {
            "run_id": run.run_id,
            "pipeline_run_id": run.id,
            "pipeline_name": run.pipeline_name,
            "dataset_name": target_table,
            "rows_ingested": len(dataframe),
            "status": "SUCCESS",
            "prediction": prediction_result,
            "prediction_error": prediction_error,
        }

    except Exception as error:
        finish_pipeline_run(
            db=db,
            run=run,
            status="FAILED",
            error_message=str(error),
        )
        raise
