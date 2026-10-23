
from datetime import datetime

from backend.prediction.service import get_prediction_history


class FakeQuery:
    def __init__(self, records):
        self.records = records

    def filter(self, condition):
        return self

    def order_by(self, ordering):
        self.records.sort(
            key=lambda record: record.predicted_at,
            reverse=True,
        )
        return self

    def limit(self, count):
        self.records = self.records[:count]
        return self

    def all(self):
        return self.records


class FakeDB:
    def __init__(self, records):
        self.records = records

    def query(self, model):
        return FakeQuery(self.records.copy())


class FakePrediction:
    def __init__(
        self,
        id,
        dataset_name,
        probability,
        risk_level,
        predicted_failure,
        predicted_at,
    ):
        self.id = id
        self.dataset_name = dataset_name
        self.failure_probability = probability
        self.risk_level = risk_level
        self.predicted_failure = predicted_failure
        self.predicted_at = predicted_at


def sample_records():
    return [
        FakePrediction(
            1, "bronze_customers", 0.563, "MEDIUM", True,
            datetime(2026, 10, 21, 6, 24),
        ),
        FakePrediction(
            2, "bronze_customers", 0.2045, "LOW", False,
            datetime(2026, 10, 21, 6, 41),
        ),
    ]


def test_history_returns_newest_first():
    db = FakeDB(sample_records())

    result = get_prediction_history(
        dataset_name="bronze_customers",
        db=db,
        limit=20,
    )

    assert len(result) == 2
    assert result[0]["id"] == 2
    assert result[1]["id"] == 1
    assert result[0]["risk_level"] == "LOW"


def test_history_respects_limit():
    db = FakeDB(sample_records())

    result = get_prediction_history(
        dataset_name="bronze_customers",
        db=db,
        limit=1,
    )

    assert len(result) == 1
    assert result[0]["id"] == 2


def test_history_returns_empty_list_when_no_records():
    db = FakeDB([])

    result = get_prediction_history(
        dataset_name="bronze_customers",
        db=db,
        limit=20,
    )

    assert result == []
