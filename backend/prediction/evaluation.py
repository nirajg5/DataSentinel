
from sqlalchemy.orm import Session

from backend.models.failure_prediction import FailurePrediction
from backend.models.pipeline_run import PipelineRun


def evaluate_predictions(db: Session) -> dict:
    """Evaluate predictions against linked, completed pipeline runs."""

    records = (
        db.query(FailurePrediction, PipelineRun)
        .join(
            PipelineRun,
            FailurePrediction.pipeline_run_id == PipelineRun.id,
        )
        .filter(PipelineRun.status.in_(["SUCCESS", "FAILED"]))
        .all()
    )

    total_predictions = db.query(FailurePrediction).count()
    linked_completed = len(records)

    tp = 0  # Predicted failure; actual failure
    fp = 0  # Predicted failure; actual success
    tn = 0  # Predicted success; actual success
    fn = 0  # Predicted success; actual failure

    for prediction, run in records:
        predicted_failure = bool(prediction.predicted_failure)
        actual_failure = run.status == "FAILED"

        if predicted_failure and actual_failure:
            tp += 1
        elif predicted_failure and not actual_failure:
            fp += 1
        elif not predicted_failure and not actual_failure:
            tn += 1
        else:
            fn += 1

    def ratio(numerator: int, denominator: int) -> float | None:
        if denominator == 0:
            return None
        return round(numerator / denominator, 4)

    precision = ratio(tp, tp + fp)
    recall = ratio(tp, tp + fn)
    specificity = ratio(tn, tn + fp)

    if precision is None or recall is None:
        f1_score = None
    elif precision + recall == 0:
        f1_score = 0.0
    else:
        f1_score = round(
            2 * precision * recall / (precision + recall), 4
        )

    return {
        "total_predictions": total_predictions,
        "evaluated_predictions": linked_completed,
        "excluded_predictions": total_predictions - linked_completed,
        "confusion_matrix": {
            "true_positive": tp,
            "false_positive": fp,
            "true_negative": tn,
            "false_negative": fn,
        },
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "false_positive_rate": (
                round(1 - specificity, 4)
                if specificity is not None
                else None
            ),
        },
        "note": (
            "Metrics are null when their denominators are zero. "
            "Only predictions linked to completed SUCCESS or FAILED "
            "pipeline runs are evaluated."
        ),
    }
