"""Tests for Phase 3 request validation schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.core.schemas import (
    ABTestRequest,
    BulkTriageRequest,
    DeleteHistoryRequest,
    FeedbackRequest,
    RuleCreateRequest,
    RuleToggleRequest,
)


class TestABTestRequest:
    def test_valid_defaults(self) -> None:
        req = ABTestRequest(ticket_text="This is a valid support ticket for testing")
        assert req.version_a == "v1"
        assert req.version_b == "v2"

    def test_custom_versions(self) -> None:
        req = ABTestRequest(
            ticket_text="This is a valid support ticket for testing",
            version_a="v3",
            version_b="v4",
        )
        assert req.version_a == "v3"
        assert req.version_b == "v4"

    def test_invalid_version_pattern(self) -> None:
        with pytest.raises(ValidationError):
            ABTestRequest(
                ticket_text="This is a valid support ticket for testing",
                version_a="latest",
            )

    def test_too_short_ticket(self) -> None:
        with pytest.raises(ValidationError):
            ABTestRequest(ticket_text="short")


class TestBulkTriageRequest:
    def test_valid_tickets(self) -> None:
        req = BulkTriageRequest(tickets=["ticket one", "ticket two"])
        assert len(req.tickets) == 2

    def test_empty_list_rejected(self) -> None:
        with pytest.raises(ValidationError):
            BulkTriageRequest(tickets=[])

    def test_single_ticket(self) -> None:
        req = BulkTriageRequest(tickets=["single ticket"])
        assert len(req.tickets) == 1


class TestFeedbackRequest:
    def test_valid_up(self) -> None:
        req = FeedbackRequest(id=1, feedback="up")
        assert req.feedback == "up"

    def test_valid_down(self) -> None:
        req = FeedbackRequest(id=1, feedback="down")
        assert req.feedback == "down"

    def test_valid_null(self) -> None:
        req = FeedbackRequest(id=1, feedback=None)
        assert req.feedback is None

    def test_invalid_feedback_value(self) -> None:
        with pytest.raises(ValidationError):
            FeedbackRequest(id=1, feedback="maybe")

    def test_default_feedback_is_none(self) -> None:
        req = FeedbackRequest(id=1)
        assert req.feedback is None


class TestDeleteHistoryRequest:
    def test_valid_ids(self) -> None:
        req = DeleteHistoryRequest(ids=[1, 2, 3])
        assert len(req.ids) == 3

    def test_empty_default(self) -> None:
        req = DeleteHistoryRequest()
        assert req.ids == []


class TestRuleCreateRequest:
    def test_valid_full_rule(self) -> None:
        req = RuleCreateRequest(
            name="Critical Billing Alert",
            priority="critical",
            category="billing",
            action="page",
            target="oncall@company.com",
        )
        assert req.name == "Critical Billing Alert"
        assert req.action == "page"

    def test_minimal_rule(self) -> None:
        req = RuleCreateRequest(name="Simple Rule")
        assert req.priority is None
        assert req.category is None
        assert req.action == "notify"
        assert req.target == ""

    def test_all_priorities(self) -> None:
        for p in ["low", "medium", "high", "urgent", "critical"]:
            req = RuleCreateRequest(name="Test", priority=p)
            assert req.priority == p

    def test_invalid_priority(self) -> None:
        with pytest.raises(ValidationError):
            RuleCreateRequest(name="Test", priority="extreme")

    def test_all_categories(self) -> None:
        for c in [
            "billing",
            "technical",
            "account",
            "shipping",
            "product",
            "cancellation",
            "refund",
            "other",
        ]:
            req = RuleCreateRequest(name="Test", category=c)
            assert req.category == c

    def test_invalid_category(self) -> None:
        with pytest.raises(ValidationError):
            RuleCreateRequest(name="Test", category="unknown")

    def test_all_actions(self) -> None:
        for a in ["notify", "escalate", "assign", "page", "auto_reply", "webhook"]:
            req = RuleCreateRequest(name="Test", action=a)
            assert req.action == a

    def test_invalid_action(self) -> None:
        with pytest.raises(ValidationError):
            RuleCreateRequest(name="Test", action="delete")

    def test_empty_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            RuleCreateRequest(name="")

    def test_long_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            RuleCreateRequest(name="x" * 201)


class TestRuleToggleRequest:
    def test_default_enabled(self) -> None:
        req = RuleToggleRequest()
        assert req.enabled is True

    def test_explicit_disabled(self) -> None:
        req = RuleToggleRequest(enabled=False)
        assert req.enabled is False
