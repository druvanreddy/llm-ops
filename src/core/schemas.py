from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class TicketCategory(StrEnum):
    BILLING = "billing"
    TECHNICAL = "technical"
    ACCOUNT = "account"
    SHIPPING = "shipping"
    PRODUCT = "product"
    CANCELLATION = "cancellation"
    REFUND = "refund"
    OTHER = "other"


class TicketPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TriageRequest(BaseModel):
    ticket_text: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="The customer support ticket text to triage",
    )
    client_id: str = Field(
        default="anonymous",
        description="Client identifier for rate limiting and cost attribution",
    )


class TriageResult(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    product: str = Field(..., description="Product area the ticket relates to")
    summary: str = Field(..., max_length=200, description="One-line summary of the issue")
    draft_reply: str = Field(..., max_length=2000, description="Suggested reply to the customer")


class TriageResponse(BaseModel):
    result: TriageResult
    metadata: ResponseMetadata


class ResponseMetadata(BaseModel):
    prompt_version: str
    model: str
    git_sha: str
    latency_ms: float
    input_tokens: int
    output_tokens: int
    cost_usd: float
    provider: str
    fallback_used: bool = False


class ErrorResponse(BaseModel):
    error: str
    error_class: str
    detail: str | None = None
    prompt_version: str | None = None
    model: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    git_sha: str


class ReadinessResponse(BaseModel):
    status: str
    checks: dict[str, bool]


class EvalResult(BaseModel):
    total_examples: int
    accuracy_by_field: dict[str, float]
    overall_accuracy: float
    schema_valid_rate: float
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    cost_per_request_usd: float
    cost_per_1k_success_usd: float
    total_cost_usd: float
    error_rate: float
    errors_by_class: dict[str, int]
