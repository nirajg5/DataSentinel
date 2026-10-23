
import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import backend.agents.graph as graph


def mock_groq_plan(monkeypatch, plan):
    """Mock Groq's planning response without an API call."""
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content=json.dumps(plan)
                )
            )
        ]
    )

    client = MagicMock()
    client.chat.completions.create.return_value = response

    monkeypatch.setattr(graph, "get_groq_client", lambda: client)

    return client


def test_freshness_comparison_selects_both_tools(monkeypatch):
    mock_groq_plan(
        monkeypatch,
        {
            "dataset_name": "bronze_customers",
            "tools": ["runbooks"],
        },
    )

    result = graph.plan_investigation(
        {
            "question": (
                "Compare freshness status and validate the SLA "
                "for bronze_customers"
            )
        }
    )

    assert result["dataset_name"] == "bronze_customers"
    assert "pipeline_history" in result["selected_tools"]
    assert "freshness" in result["selected_tools"]


def test_unapproved_tools_are_filtered(monkeypatch):
    mock_groq_plan(
        monkeypatch,
        {
            "dataset_name": "bronze_customers",
            "tools": [
                "pipeline_history",
                "unknown_tool",
                "freshness",
            ],
        },
    )

    result = graph.plan_investigation(
        {
            "question": (
                "Check the latest pipeline history "
                "for bronze_customers"
            )
        }
    )

    assert result["selected_tools"] == [
        "pipeline_history",
        "freshness",
    ] or result["selected_tools"] == ["pipeline_history"]

    assert "unknown_tool" not in result["selected_tools"]


def test_unknown_dataset_is_rejected_by_planner(monkeypatch):
    mock_groq_plan(
        monkeypatch,
        {
            "dataset_name": "unknown_dataset",
            "tools": ["pipeline_history"],
        },
    )

    result = graph.plan_investigation(
        {
            "question": "Check pipeline history for an unknown dataset"
        }
    )

    assert result["dataset_name"] is None


def test_empty_investigation_question_is_rejected():
    with pytest.raises(ValueError, match="Question cannot be empty"):
        graph.investigate("   ")



def test_gather_evidence_validates_freshness(monkeypatch):
    pipeline_history = {
        "dataset_name": "bronze_customers",
        "runs": [
            {
                "run_id": "test-run-1",
                "status": "SUCCESS",
                "completed_at": "2026-10-22T05:58:18.213834",
            }
        ],
    }

    freshness_data = {
        "dataset_name": "bronze_customers",
        "freshness": {
            "actual_update_time": "2026-10-22T05:58:18.213834",
            "checked_at": "2026-10-22T06:00:00",
            "freshness_status": "FRESH",
            "freshness_score": 99.88,
        },
    }

    monkeypatch.setattr(
        graph,
        "get_pipeline_history",
        MagicMock(return_value=pipeline_history),
    )
    monkeypatch.setattr(
        graph,
        "get_dataset_freshness",
        MagicMock(return_value=freshness_data),
    )

    validation_result = {
        "valid": True,
        "dataset_name": "bronze_customers",
        "sla_hours": 24,
        "latest_successful_run_id": "test-run-1",
        "issues": [],
    }

    validator = MagicMock(return_value=validation_result)
    monkeypatch.setattr(
        graph,
        "validate_freshness_evidence",
        validator,
    )

    result = graph.gather_evidence(
        {
            "question": "Compare freshness with pipeline completion and SLA",
            "dataset_name": "bronze_customers",
            "selected_tools": ["pipeline_history", "freshness"],
        }
    )

    assert result["evidence"]["pipeline_history"] == pipeline_history
    assert result["evidence"]["freshness"] == freshness_data
    assert result["evidence"]["freshness_validation"] == validation_result

    validator.assert_called_once_with(
        dataset_name="bronze_customers",
        pipeline_history=pipeline_history,
        freshness_data=freshness_data,
    )


def test_gather_evidence_skips_validation_without_both_sources(
    monkeypatch,
):
    monkeypatch.setattr(
        graph,
        "get_pipeline_history",
        MagicMock(return_value={"runs": []}),
    )

    validator = MagicMock()
    monkeypatch.setattr(
        graph,
        "validate_freshness_evidence",
        validator,
    )

    result = graph.gather_evidence(
        {
            "question": "Check pipeline history",
            "dataset_name": "bronze_customers",
            "selected_tools": ["pipeline_history"],
        }
    )

    assert "pipeline_history" in result["evidence"]
    assert "freshness" not in result["evidence"]
    assert "freshness_validation" not in result["evidence"]
    validator.assert_not_called()


def test_runbook_search_only_when_selected(monkeypatch):
    runbooks = {"results": ["ingestion_runbook.md"]}
    search = MagicMock(return_value=runbooks)

    monkeypatch.setattr(graph, "search_runbooks", search)
    monkeypatch.setattr(
        graph,
        "get_pipeline_history",
        MagicMock(return_value={"runs": []}),
    )

    result = graph.gather_evidence(
        {
            "question": "How should ingestion failures be resolved?",
            "dataset_name": "bronze_customers",
            "selected_tools": ["runbooks"],
        }
    )

    assert result["evidence"]["runbooks"] == runbooks
    search.assert_called_once_with(
        "How should ingestion failures be resolved?"
    )


def test_synthesize_answer_uses_supplied_evidence(monkeypatch):
    expected_answer = (
        "bronze_customers is FRESH with a score of 99.88. "
        "The evidence passes validation against the 24-hour SLA."
    )

    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=expected_answer)
            )
        ]
    )

    client = MagicMock()
    client.chat.completions.create.return_value = response
    monkeypatch.setattr(graph, "get_groq_client", lambda: client)

    evidence = {
        "freshness_validation": {
            "valid": True,
            "sla_hours": 24,
            "issues": [],
        },
        "freshness": {
            "freshness": {
                "freshness_status": "FRESH",
                "freshness_score": 99.88,
            }
        },
    }

    result = graph.synthesize_answer(
        {
            "question": "Check bronze_customers freshness",
            "evidence": evidence,
        }
    )

    assert result["answer"] == expected_answer

    request_messages = (
        client.chat.completions.create.call_args.kwargs["messages"]
    )
    submitted_evidence = json.loads(request_messages[1]["content"])

    assert submitted_evidence["evidence"] == evidence
    assert submitted_evidence["question"] == (
        "Check bronze_customers freshness"
    )


def test_synthesize_answer_rejects_empty_response(monkeypatch):
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=None)
            )
        ]
    )

    client = MagicMock()
    client.chat.completions.create.return_value = response
    monkeypatch.setattr(graph, "get_groq_client", lambda: client)

    with pytest.raises(ValueError, match="Groq returned an empty answer"):
        graph.synthesize_answer(
            {
                "question": "Check freshness",
                "evidence": {},
            }
        )


def test_missing_groq_api_key_is_rejected(monkeypatch):
    monkeypatch.setattr(
        graph.settings,
        "GROQ_API_KEY",
        "",
    )

    with pytest.raises(ValueError, match="GROQ_API_KEY is missing"):
        graph.get_groq_client()



def test_complete_investigation_graph(monkeypatch):
    plan_response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content=json.dumps({
                        "dataset_name": "bronze_customers",
                        "tools": ["pipeline_history", "freshness"],
                    })
                )
            )
        ]
    )

    answer_text = (
        "bronze_customers is FRESH with a score of 99.88. "
        "The evidence matches the latest successful pipeline run "
        "and passes the configured 24-hour SLA validation."
    )

    answer_response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=answer_text)
            )
        ]
    )

    client = MagicMock()
    client.chat.completions.create.side_effect = [
        plan_response,
        answer_response,
    ]

    monkeypatch.setattr(
        graph,
        "get_groq_client",
        lambda: client,
    )

    run_time = "2026-10-22T05:58:18.213834"

    monkeypatch.setattr(
        graph,
        "get_pipeline_history",
        MagicMock(return_value={
            "dataset_name": "bronze_customers",
            "runs": [{
                "run_id": "test-run-1",
                "status": "SUCCESS",
                "completed_at": run_time,
            }],
        }),
    )

    monkeypatch.setattr(
        graph,
        "get_dataset_freshness",
        MagicMock(return_value={
            "dataset_name": "bronze_customers",
            "freshness": {
                "actual_update_time": run_time,
                "checked_at": "2026-10-22T06:00:00",
                "freshness_status": "FRESH",
                "freshness_score": 99.88,
            },
        }),
    )

    question = (
        "Compare freshness status and score of bronze_customers "
        "against its latest successful pipeline completion and SLA."
    )

    result = graph.investigate(question)

    assert result["dataset_name"] == "bronze_customers"
    assert "pipeline_history" in result["tools_used"]
    assert "freshness" in result["tools_used"]

    assert result["evidence"]["freshness_validation"]["valid"] is True
    assert result["evidence"]["freshness_validation"]["sla_hours"] == 24

    assert result["answer"] == answer_text
    assert client.chat.completions.create.call_count == 2


def test_planner_rejects_invalid_json(monkeypatch):
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content="{invalid json")
            )
        ]
    )

    client = MagicMock()
    client.chat.completions.create.return_value = response

    monkeypatch.setattr(
        graph,
        "get_groq_client",
        lambda: client,
    )

    with pytest.raises(json.JSONDecodeError):
        graph.plan_investigation(
            {"question": "Check bronze_customers freshness"}
        )


def test_evidence_tool_failure_propagates(monkeypatch):
    monkeypatch.setattr(
        graph,
        "get_pipeline_history",
        MagicMock(
            side_effect=RuntimeError("Pipeline history unavailable")
        ),
    )

    with pytest.raises(
        RuntimeError,
        match="Pipeline history unavailable",
    ):
        graph.gather_evidence(
            {
                "question": "Check pipeline history",
                "dataset_name": "bronze_customers",
                "selected_tools": ["pipeline_history"],
            }
        )
