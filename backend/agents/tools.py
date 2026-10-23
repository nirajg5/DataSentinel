
from sqlalchemy import inspect, text

from backend.database.database import engine
from backend.rag.retriever import retrieve_documents


def get_pipeline_history(dataset_name: str) -> dict:
    dataset_name = dataset_name.strip().lower()

    if not dataset_name.startswith("bronze_"):
        raise ValueError("Only registered Bronze datasets are supported.")

    if not inspect(engine).has_table("pipeline_runs"):
        raise ValueError("pipeline_runs table does not exist.")

    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT run_id, status, error_message,
                       rows_read, rows_processed, rows_loaded,
                       started_at, completed_at
                FROM pipeline_runs
                WHERE dataset_name = :dataset_name
                ORDER BY created_at DESC
                LIMIT 10
            """),
            {"dataset_name": dataset_name},
        ).mappings().all()

    return {
        "dataset_name": dataset_name,
        "runs": [dict(row) for row in rows],
    }


def get_dataset_freshness(dataset_name: str) -> dict:
    dataset_name = dataset_name.strip().lower()

    if not dataset_name.startswith("bronze_"):
        raise ValueError("Only registered Bronze datasets are supported.")

    if not inspect(engine).has_table("dataset_freshness"):
        raise ValueError("dataset_freshness table does not exist.")

    columns = {
        col["name"]
        for col in inspect(engine).get_columns("dataset_freshness")
    }

    score_column = (
        "freshness_score"
        if "freshness_score" in columns
        else "score"
        if "score" in columns
        else None
    )

    if not score_column:
        raise ValueError("No freshness score column was found.")

    with engine.connect() as connection:
        row = connection.execute(
            text(f"""
                SELECT dataset_name, freshness_status,
                       "{score_column}" AS freshness_score,
                       actual_update_time, checked_at
                FROM dataset_freshness
                WHERE dataset_name = :dataset_name
                ORDER BY checked_at DESC
                LIMIT 1
            """),
            {"dataset_name": dataset_name},
        ).mappings().first()

    return {
        "dataset_name": dataset_name,
        "freshness": dict(row) if row else None,
    }


def search_runbooks(question: str) -> dict:
    results = retrieve_documents(question, top_k=5)

    return {
        "results": results,
        "sources": sorted({
            result["source"] for result in results
        }),
    }
