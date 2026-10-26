"""Integration tests for FastAPI endpoints in src/api/app.py."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.core import database as db


@pytest.fixture(autouse=True)
def _temp_db(tmp_path: Path):
    test_db = tmp_path / "test.db"
    with patch.object(db, "DB_PATH", test_db):
        db.init_db()
        yield


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.app_version = "0.1.0"
    settings.git_sha = "abc123"
    settings.primary_model = "test/model"
    settings.fallback_model = "test/fallback"
    settings.active_prompt_version = "v1"
    settings.openai_api_key = ""
    settings.anthropic_api_key = ""
    settings.groq_api_key = "test-key"
    settings.max_input_tokens = 4096
    settings.prompts_dir = "prompts"
    settings.golden_set_path = "data/golden_set"
    return settings


@pytest.fixture
def mock_gateway():
    gateway = MagicMock()
    gateway._primary_breaker = MagicMock()
    gateway._primary_breaker.is_available = True
    gateway._fallback_breaker = MagicMock()
    gateway._fallback_breaker.is_available = True
    return gateway


@pytest.fixture
async def client(mock_settings, mock_gateway):
    from src.api.app import app

    app.state.settings = mock_settings
    app.state.gateway = mock_gateway
    app.state.service = MagicMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestHealthEndpoints:
    async def test_healthz(self, client: AsyncClient, mock_settings) -> None:
        resp = await client.get("/healthz")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "git_sha" in data

    async def test_readyz(self, client: AsyncClient) -> None:
        resp = await client.get("/readyz")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]
        assert data["checks"]["database"] is True
        assert "primary_circuit_breaker" in data["checks"]


class TestHistoryEndpoints:
    async def test_list_empty_history(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/history")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_delete_history(self, client: AsyncClient) -> None:
        db.save_triage("test", {"result": {}, "metadata": {}})
        resp = await client.delete("/api/v1/history")
        assert resp.status_code == 200
        assert resp.json()["deleted"] >= 0

    async def test_delete_by_ids(self, client: AsyncClient) -> None:
        row_id = db.save_triage("test", {"result": {}, "metadata": {}})
        resp = await client.post(
            "/api/v1/history/delete",
            json={"ids": [row_id]},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 1

    async def test_delete_empty_ids(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/history/delete", json={"ids": []})
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 0


class TestFeedbackEndpoint:
    async def test_submit_feedback(self, client: AsyncClient) -> None:
        row_id = db.save_triage("test", {"result": {}, "metadata": {}})
        resp = await client.post(
            "/api/v1/feedback",
            json={"id": row_id, "feedback": "up"},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_invalid_feedback_value(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/feedback",
            json={"id": 1, "feedback": "invalid"},
        )
        assert resp.status_code == 422


class TestRulesEndpoints:
    async def test_list_rules_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/rules")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_rule(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/rules",
            json={
                "name": "Test Rule",
                "priority": "high",
                "category": "billing",
                "action": "notify",
                "target": "#alerts",
            },
        )
        assert resp.status_code == 200
        assert "id" in resp.json()

    async def test_create_rule_invalid(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/rules",
            json={"name": "", "action": "notify"},
        )
        assert resp.status_code == 422

    async def test_delete_rule(self, client: AsyncClient) -> None:
        create_resp = await client.post(
            "/api/v1/rules",
            json={"name": "To Delete", "action": "notify"},
        )
        rule_id = create_resp.json()["id"]
        del_resp = await client.delete(f"/api/v1/rules/{rule_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["ok"] is True

    async def test_toggle_rule(self, client: AsyncClient) -> None:
        create_resp = await client.post(
            "/api/v1/rules",
            json={"name": "Toggle Me", "action": "escalate"},
        )
        rule_id = create_resp.json()["id"]
        toggle_resp = await client.post(
            f"/api/v1/rules/{rule_id}/toggle",
            json={"enabled": False},
        )
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["ok"] is True


class TestAnalyticsEndpoints:
    async def test_stats_endpoint(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_requests" in data
        assert "total_cost" in data

    async def test_analytics_endpoint(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert "categories" in data
        assert "priorities" in data
        assert "latency" in data
        assert "confidence" in data


class TestExportEndpoints:
    async def test_export_json(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/export/json")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/json"

    async def test_export_csv(self, client: AsyncClient) -> None:
        db.save_triage(
            "csv test ticket",
            {
                "result": {
                    "category": "billing",
                    "priority": "high",
                    "product": "payments",
                    "summary": "test summary",
                },
                "metadata": {
                    "model": "test-model",
                    "latency_ms": 100.0,
                    "input_tokens": 10,
                    "output_tokens": 20,
                },
            },
        )
        resp = await client.get("/api/v1/export/csv")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    async def test_export_invalid_format(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/export/xml")
        assert resp.status_code == 422


class TestTriageValidation:
    async def test_triage_rejects_short_input(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/triage",
            json={"ticket_text": "short"},
        )
        assert resp.status_code == 422

    async def test_ab_test_rejects_short_input(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/ab-test",
            json={"ticket_text": "short"},
        )
        assert resp.status_code == 422

    async def test_bulk_triage_rejects_empty(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/bulk-triage",
            json={"tickets": []},
        )
        assert resp.status_code == 422


class TestMetricsEndpoint:
    async def test_prometheus_metrics(self, client: AsyncClient) -> None:
        resp = await client.get("/metrics")
        assert resp.status_code == 200
        assert (
            "text/plain" in resp.headers["content-type"]
            or "openmetrics" in resp.headers["content-type"]
        )
