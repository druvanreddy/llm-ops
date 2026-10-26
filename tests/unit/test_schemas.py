import pytest
from pydantic import ValidationError

from src.core.schemas import TicketCategory, TicketPriority, TriageRequest, TriageResult


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
