from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = (PROJECT_ROOT / "data" / "source").resolve()


def read_csv_file(file_path: str) -> pd.DataFrame:
    path = Path(file_path)

    if not path.is_absolute():
        path = PROJECT_ROOT / path

    path = path.resolve()

    # Only permit ingestion from the configured source directory.
    if not path.is_relative_to(SOURCE_ROOT):
        raise ValueError(
            "CSV files must be inside the data/source directory"
        )

    if not path.is_file():
        raise FileNotFoundError(
            f"Source file not found: {path.name}"
        )

    if path.suffix.lower() != ".csv":
        raise ValueError("Only CSV files are supported")

    return pd.read_csv(path)