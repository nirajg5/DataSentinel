
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.constants import ADMIN
from backend.auth.dependencies import get_current_user
from backend.agents import routes as agent_routes


class FakeUser:
    role = ADMIN


@pytest.fixture
def client():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_investigation_returns_success(client, monkeypatch):
    expected = {
        "question": "Check customer freshness",
        "dataset_name": "bronze_customers",
        "tools_used": ["pipeline_history", "freshness"],
        "evidence": {},
        "answer": "Freshness evidence is consistent.",
    }

    monkeypatch.setattr(
        agent_routes,
        "investigate",
        lambda question: expected,
    )

    response = client.post(
        "/agent/investigate",
        json={"question": "Check customer freshness"},
    )

    assert response.status_code == 200
    assert response.json() == expected


def test_investigation_rejects_short_question(client):
    response = client.post(
        "/agent/investigate",
        json={"question": "abc"},
    )

    assert response.status_code == 422


def test_investigation_rejects_whitespace_question(client):
    response = client.post(
        "/agent/investigate",
        json={"question": "     "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Question cannot be empty."


@pytest.mark.parametrize(
    "failure",
    [
        ValueError("Invalid planner response"),
        RuntimeError("Evidence retrieval failed"),
    ],
)
def test_investigation_returns_sanitized_502(
    client, monkeypatch, failure
):
    def fail_investigation(question):
        raise failure

    monkeypatch.setattr(
        agent_routes,
        "investigate",
        fail_investigation,
    )

    response = client.post(
        "/agent/investigate",
        json={"question": "Check customer freshness"},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Investigation failed. Check application logs."
    )
    assert str(failure) not in response.text


def test_investigation_requires_authentication():
    app.dependency_overrides.clear()

    try:
        with TestClient(app) as test_client:
            response = test_client.post(
                "/agent/investigate",
                json={"question": "Check customer freshness"},
            )

        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
