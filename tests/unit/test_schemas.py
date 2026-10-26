import pytest
from pydantic import ValidationError

from src.core.schemas import (
    CustomerIntent,
    TicketCategory,
    TicketPriority,
    TicketSeverity,
    TriageRequest,
    TriageResult,
)


class TestTriageRequest:
    def test_valid_request(self) -> None:
        req = TriageRequest(ticket_text="My order is missing and I need help")
        assert req.client_id == "anonymous"

    def test_too_short_ticket(self) -> None:
        with pytest.raises(ValidationError):
            TriageRequest(ticket_text="short")

    def test_custom_client_id(self) -> None:
        req = TriageRequest(
            ticket_text="My order is missing and I need help",
            client_id="client-123",
        )
        assert req.client_id == "client-123"


class TestTriageResult:
    def test_valid_result(self) -> None:
        result = TriageResult(
            category=TicketCategory.BILLING,
            priority=TicketPriority.HIGH,
            product="payments",
            summary="Double charge on order",
            draft_reply="I understand your concern about the double charge...",
        )
        assert result.category == TicketCategory.BILLING

    def test_parse_from_json(self) -> None:
        raw = (
            '{"category": "billing", "priority": "high",'
            ' "product": "payments", "summary": "test", "draft_reply": "reply"}'
        )
        result = TriageResult.model_validate_json(raw)
        assert result.category == TicketCategory.BILLING
        assert result.priority == TicketPriority.HIGH

    def test_invalid_category_fails(self) -> None:
        raw = (
            '{"category": "invalid", "priority": "high",'
            ' "product": "x", "summary": "x", "draft_reply": "x"}'
        )
        with pytest.raises(ValidationError):
            TriageResult.model_validate_json(raw)

    def test_missing_field_fails(self) -> None:
        raw = '{"category": "billing", "priority": "high"}'
        with pytest.raises(ValidationError):
            TriageResult.model_validate_json(raw)

    def test_new_fields_have_defaults(self) -> None:
        result = TriageResult(
            category=TicketCategory.BILLING,
            priority=TicketPriority.HIGH,
            product="payments",
            summary="test",
            draft_reply="reply",
        )
        assert result.severity == TicketSeverity.MINOR
        assert result.customer_intent == CustomerIntent.GET_HELP
        assert result.secondary_category is None
        assert result.extracted_entities == []
        assert result.recommended_action == "review"
        assert result.review_required is False

    def test_full_json_with_new_fields(self) -> None:
        raw = (
            '{"category": "billing", "priority": "urgent", "severity": "critical",'
            ' "customer_intent": "request_refund", "secondary_category": "refund",'
            ' "product": "payments", "summary": "Double charge",'
            ' "extracted_entities": [{"type": "order_id", "value": "#123"}],'
            ' "recommended_action": "Issue refund", "review_required": false,'
            ' "draft_reply": "We will refund you.", "confidence": 0.95}'
        )
        result = TriageResult.model_validate_json(raw)
        assert result.severity == TicketSeverity.CRITICAL
        assert result.customer_intent == CustomerIntent.REQUEST_REFUND
        assert result.secondary_category == TicketCategory.REFUND
        assert len(result.extracted_entities) == 1
        assert result.extracted_entities[0].type == "order_id"
        assert result.extracted_entities[0].value == "#123"
        assert result.recommended_action == "Issue refund"
        assert result.review_required is False

    def test_invalid_severity_fails(self) -> None:
        raw = (
            '{"category": "billing", "priority": "high", "severity": "extreme",'
            ' "product": "x", "summary": "x", "draft_reply": "x"}'
        )
        with pytest.raises(ValidationError):
            TriageResult.model_validate_json(raw)

    def test_invalid_customer_intent_fails(self) -> None:
        raw = (
            '{"category": "billing", "priority": "high", "customer_intent": "destroy_everything",'
            ' "product": "x", "summary": "x", "draft_reply": "x"}'
        )
        with pytest.raises(ValidationError):
            TriageResult.model_validate_json(raw)
