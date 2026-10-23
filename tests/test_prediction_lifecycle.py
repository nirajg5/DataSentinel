
from types import SimpleNamespace

from backend.prediction.evaluation import evaluate_predictions


class FakeQuery:
    def __init__(self, records):
        self.records = records

    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return self.records

    def count(self):
        return self.records


class FakeDB:
    def __init__(self, records, total_predictions):
        self.records = records
        self.total_predictions = total_predictions
        self.query_count = 0

    def query(self, *args):
        self.query_count += 1

        if self.query_count == 1:
            return FakeQuery(self.records)

        return FakeQuery(self.total_predictions)


def make_linked_record(predicted_failure, actual_status):
    prediction = SimpleNamespace(
        predicted_failure=predicted_failure,
        pipeline_run_id=1,
    )
    run = SimpleNamespace(
        id=1,
        status=actual_status,
    )
    return prediction, run


def test_linked_failed_run_is_evaluated_as_true_positive():
    records = [
        make_linked_record(True, "FAILED"),
    ]

    result = evaluate_predictions(
        FakeDB(records, total_predictions=1)
    )

    assert result["evaluated_predictions"] == 1
    assert result["excluded_predictions"] == 0
    assert result["confusion_matrix"]["true_positive"] == 1
    assert result["metrics"]["precision"] == 1.0
    assert result["metrics"]["recall"] == 1.0
    assert result["metrics"]["f1_score"] == 1.0


def test_linked_successful_run_is_evaluated_as_false_positive():
    records = [
        make_linked_record(True, "SUCCESS"),
    ]

    result = evaluate_predictions(
        FakeDB(records, total_predictions=1)
    )

    assert result["evaluated_predictions"] == 1
    assert result["confusion_matrix"]["false_positive"] == 1
    assert result["metrics"]["precision"] == 0.0
    assert result["metrics"]["false_positive_rate"] == 1.0
