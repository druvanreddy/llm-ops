"""Tests for src/core/database.py — CRUD operations, analytics, escalation rules."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from src.core import database as db


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path: Path):
    test_db = tmp_path / "test_triage.db"
    with patch.object(db, "DB_PATH", test_db):
        db.init_db()
        yield


class TestInitDb:
    def test_creates_tables(self) -> None:
        with db._get_conn() as conn:
            tables = {
                r[0]
                for r in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
        assert "triage_history" in tables
        assert "escalation_rules" in tables

    def test_idempotent(self) -> None:
        db.init_db()
        db.init_db()
        with db._get_conn() as conn:
            count = conn.execute(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='triage_history'"
            ).fetchone()[0]
        assert count == 1

    def test_adds_columns_on_migration(self) -> None:
        with db._get_conn() as conn:
            cols = {r[1] for r in conn.execute("PRAGMA table_info(triage_history)").fetchall()}
        assert "feedback" in cols
        assert "language" in cols
        assert "request_id" in cols


class TestSaveAndGetHistory:
    def _make_result(self, **overrides) -> dict:
        base = {
            "result": {
                "category": "billing",
                "priority": "high",
                "product": "payments",
                "summary": "test",
                "draft_reply": "reply",
                "confidence": 0.9,
            },
            "metadata": {
                "model": "test-model",
                "latency_ms": 100,
                "input_tokens": 10,
                "output_tokens": 20,
                "cost_usd": 0.001,
                "fallback_used": False,
            },
        }
        base.update(overrides)
        return base

    def test_save_and_retrieve(self) -> None:
        result = self._make_result()
        row_id = db.save_triage("test ticket", result, language="en", request_id="req-1")
        assert isinstance(row_id, int)
        assert row_id > 0

        history = db.get_history()
        assert len(history) == 1
        assert history[0]["text"] == "test ticket"
        assert history[0]["language"] == "en"
        assert history[0]["request_id"] == "req-1"

    def test_history_ordering(self) -> None:
        for i in range(3):
            db.save_triage(f"ticket {i}", self._make_result())
        history = db.get_history()
        assert len(history) == 3
        assert history[0]["ts"] >= history[1]["ts"]

    def test_history_limit(self) -> None:
        for i in range(5):
            db.save_triage(f"ticket {i}", self._make_result())
        history = db.get_history(limit=3)
        assert len(history) == 3

    def test_default_language(self) -> None:
        db.save_triage("ticket", self._make_result())
        history = db.get_history()
        assert history[0]["language"] == "en"


class TestFeedback:
    def test_set_feedback(self) -> None:
        result = {"result": {"category": "billing"}, "metadata": {"model": "m"}}
        row_id = db.save_triage("ticket", result)
        assert db.set_feedback(row_id, "up") is True

        history = db.get_history()
        assert history[0]["feedback"] == "up"

    def test_clear_feedback(self) -> None:
        result = {"result": {"category": "billing"}, "metadata": {"model": "m"}}
        row_id = db.save_triage("ticket", result)
        db.set_feedback(row_id, "up")
        db.set_feedback(row_id, None)

        history = db.get_history()
        assert history[0]["feedback"] is None

    def test_feedback_nonexistent_id(self) -> None:
        assert db.set_feedback(99999, "up") is False


class TestDeleteOperations:
    def _insert(self, n: int = 3) -> list[int]:
        ids = []
        for i in range(n):
            ids.append(db.save_triage(f"ticket {i}", {"result": {}, "metadata": {}}))
        return ids

    def test_delete_by_ids(self) -> None:
        ids = self._insert(3)
        deleted = db.delete_by_ids([ids[0], ids[1]])
        assert deleted == 2
        assert len(db.get_history()) == 1

    def test_delete_empty_list(self) -> None:
        self._insert(2)
        assert db.delete_by_ids([]) == 0
        assert len(db.get_history()) == 2

    def test_clear_history(self) -> None:
        self._insert(5)
        count = db.clear_history()
        assert count == 5
        assert len(db.get_history()) == 0


class TestEscalationRules:
    def test_save_and_get_rules(self) -> None:
        rule_id = db.save_rule(
            name="Critical Alert",
            priority="critical",
            category="billing",
            action="page",
            target="oncall@company.com",
        )
        assert isinstance(rule_id, int)

        rules = db.get_rules()
        assert len(rules) == 1
        assert rules[0]["name"] == "Critical Alert"
        assert rules[0]["priority"] == "critical"
        assert rules[0]["action"] == "page"
        assert rules[0]["enabled"] == 1

    def test_delete_rule(self) -> None:
        rule_id = db.save_rule("Test", None, None, "notify", "")
        assert db.delete_rule(rule_id) is True
        assert len(db.get_rules()) == 0

    def test_delete_nonexistent_rule(self) -> None:
        assert db.delete_rule(99999) is False

    def test_toggle_rule(self) -> None:
        rule_id = db.save_rule("Test", None, None, "notify", "")
        db.toggle_rule(rule_id, False)
        rules = db.get_rules()
        assert rules[0]["enabled"] == 0

        db.toggle_rule(rule_id, True)
        rules = db.get_rules()
        assert rules[0]["enabled"] == 1

    def test_check_escalation_matches(self) -> None:
        db.save_rule("Billing Alert", "high", "billing", "notify", "#alerts")
        triggered = db.check_escalation("high", "billing")
        assert len(triggered) == 1
        assert triggered[0]["name"] == "Billing Alert"

    def test_check_escalation_no_match(self) -> None:
        db.save_rule("Billing Alert", "high", "billing", "notify", "#alerts")
        triggered = db.check_escalation("low", "technical")
        assert len(triggered) == 0

    def test_check_escalation_wildcard_priority(self) -> None:
        db.save_rule("All Billing", None, "billing", "notify", "#billing")
        triggered = db.check_escalation("low", "billing")
        assert len(triggered) == 1

    def test_disabled_rule_not_triggered(self) -> None:
        rule_id = db.save_rule("Disabled", "high", "billing", "notify", "")
        db.toggle_rule(rule_id, False)
        triggered = db.check_escalation("high", "billing")
        assert len(triggered) == 0


class TestAnalytics:
    def _insert_with_result(self, category="billing", priority="high", severity="major",
                            intent="get_help", confidence=0.85, latency=100, cost=0.001):
        result = {
            "result": {
                "category": category,
                "priority": priority,
                "severity": severity,
                "customer_intent": intent,
                "confidence": confidence,
                "product": "test",
                "summary": "test",
                "draft_reply": "reply",
            },
            "metadata": {
                "model": "test-model",
                "latency_ms": latency,
                "input_tokens": 10,
                "output_tokens": 20,
                "cost_usd": cost,
                "fallback_used": False,
            },
        }
        db.save_triage("ticket", result, language="en")

    def test_analytics_with_data(self) -> None:
        self._insert_with_result(category="billing", priority="high", confidence=0.9)
        self._insert_with_result(category="technical", priority="low", confidence=0.5)

        analytics = db.get_analytics()
        assert len(analytics["categories"]) == 2
        assert len(analytics["priorities"]) == 2
        assert analytics["latency"]["p50"] > 0
        assert analytics["total_cost"] > 0
        assert analytics["cost_per_ticket"] > 0

    def test_analytics_confidence_buckets(self) -> None:
        self._insert_with_result(confidence=0.95)
        self._insert_with_result(confidence=0.7)
        self._insert_with_result(confidence=0.4)

        analytics = db.get_analytics()
        buckets = {b["name"]: b["value"] for b in analytics["confidence"]["buckets"]}
        assert buckets["High (≥80%)"] == 1
        assert buckets["Medium (60-80%)"] == 1
        assert buckets["Low (<60%)"] == 1

    def test_analytics_empty_db(self) -> None:
        analytics = db.get_analytics()
        assert analytics["categories"] == []
        assert analytics["priorities"] == []
        assert analytics["latency"]["p50"] == 0
        assert analytics["cost_per_ticket"] == 0


class TestExportHistory:
    def test_export_json(self) -> None:
        result = {"result": {"category": "billing"}, "metadata": {"model": "m"}}
        db.save_triage("test", result)
        exported = db.export_history("json")
        data = json.loads(exported)
        assert len(data) == 1
        assert data[0]["ticket_text"] == "test"

    def test_export_csv(self) -> None:
        result = {
            "result": {
                "category": "billing",
                "priority": "high",
                "product": "payments",
                "summary": "test summary",
            },
            "metadata": {
                "model": "m",
                "latency_ms": 100.0,
                "input_tokens": 10,
                "output_tokens": 20,
            },
        }
        db.save_triage("test ticket", result)
        exported = db.export_history("csv")
        assert "test ticket" in exported
        assert "billing" in exported
        lines = exported.strip().split("\n")
        assert len(lines) == 2  # header + 1 row


class TestGetStats:
    def test_stats_with_data(self) -> None:
        result = {
            "result": {"category": "billing"},
            "metadata": {
                "model": "test-model",
                "latency_ms": 200,
                "input_tokens": 100,
                "output_tokens": 50,
                "cost_usd": 0.01,
                "fallback_used": False,
            },
        }
        db.save_triage("ticket", result)
        db.set_feedback(1, "up")

        stats = db.get_stats()
        assert stats["total_requests"] == 1
        assert stats["total_cost"] == 0.01
        assert stats["total_input_tokens"] == 100
        assert stats["total_output_tokens"] == 50
        assert stats["thumbs_up"] == 1
        assert stats["thumbs_down"] == 0
        assert len(stats["requests_by_model"]) == 1

    def test_stats_empty_db(self) -> None:
        stats = db.get_stats()
        assert stats["total_requests"] == 0
        assert stats["total_cost"] == 0
