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


class TicketSeverity(StrEnum):
    COSMETIC = "cosmetic"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class CustomerIntent(StrEnum):
    REQUEST_REFUND = "request_refund"
    GET_HELP = "get_help"
    FILE_COMPLAINT = "file_complaint"
    CANCEL_SERVICE = "cancel_service"
    CHANGE_ACCOUNT = "change_account"
    ASK_QUESTION = "ask_question"
    REPORT_BUG = "report_bug"
    REQUEST_FEATURE = "request_feature"
    OTHER = "other"


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
    prompt_version: str | None = Field(
        default=None,
        pattern=r"^v\d+$",
        description="Prompt version to use (e.g. v1, v2). Defaults to active version.",
    )


class ExtractedEntity(BaseModel):
    type: str = Field(description="Entity type, e.g. order_id, email, transaction_id, amount")
    value: str = Field(description="Extracted value")


class TriageResult(BaseModel):
    category: TicketCategory
    secondary_category: TicketCategory | None = Field(
        default=None, description="Secondary category if the ticket spans two areas"
    )
    priority: TicketPriority
    severity: TicketSeverity = Field(
        default=TicketSeverity.MINOR, description="Impact severity on the customer"
    )
    confidence: float = Field(
        default=1.0, ge=0.0, le=1.0, description="Classification confidence (0-1)"
    )
    customer_intent: CustomerIntent = Field(
        default=CustomerIntent.GET_HELP, description="What the customer is trying to accomplish"
    )
    product: str = Field(..., description="Product area the ticket relates to")
    summary: str = Field(..., max_length=200, description="One-line summary of the issue")
    extracted_entities: list[ExtractedEntity] = Field(
        default_factory=list, description="Extracted entities like order IDs, emails, amounts"
    )
    recommended_action: str = Field(
        default="review", max_length=200, description="Suggested next step for the support agent"
    )
    review_required: bool = Field(
        default=False, description="True if a human should review before sending the draft reply"
    )
    draft_reply: str = Field(..., max_length=2000, description="Suggested reply to the customer")
    detected_language: str = Field(default="en", description="ISO 639-1 language code")


class ResponseMetadata(BaseModel):
    request_id: str = Field(description="Unique identifier for this triage request")
    prompt_version: str
    model: str
    git_sha: str
    latency_ms: float
    input_tokens: int
    output_tokens: int
    cost_usd: float
    provider: str
    fallback_used: bool = False


class TriageResponse(BaseModel):
    result: TriageResult
    metadata: ResponseMetadata


class ABTestRequest(BaseModel):
    ticket_text: str = Field(..., min_length=10, max_length=10000)
    version_a: str = Field(default="v1", pattern=r"^v\d+$")
    version_b: str = Field(default="v2", pattern=r"^v\d+$")


class BulkTriageRequest(BaseModel):
    tickets: list[str] = Field(..., min_length=1, max_length=50)
    prompt_version: str | None = Field(
        default=None,
        pattern=r"^v\d+$",
        description="Prompt version to use (e.g. v1, v2). Defaults to active version.",
    )


class FeedbackRequest(BaseModel):
    id: int
    feedback: str | None = Field(default=None, pattern=r"^(up|down)$")


class DeleteHistoryRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)


class RuleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    priority: str | None = Field(default=None, pattern=r"^(low|medium|high|urgent|critical)$")
    category: str | None = Field(
        default=None,
        pattern=r"^(billing|technical|account|shipping|product|cancellation|refund|other)$",
    )
    action: str = Field(
        default="notify", pattern=r"^(notify|escalate|assign|page|auto_reply|webhook)$"
    )
    target: str = Field(default="", max_length=500)


class RuleToggleRequest(BaseModel):
    enabled: bool = True


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
