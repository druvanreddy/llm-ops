from __future__ import annotations

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from src.core.config import Settings

TRACER_NAME = "llm-ops-triage"

# OTel GenAI semantic conventions (pinned to v0.29.0, 2026-06)
GENAI_REQUEST_MODEL = "gen_ai.request.model"
GENAI_REQUEST_TEMPERATURE = "gen_ai.request.temperature"
GENAI_REQUEST_MAX_TOKENS = "gen_ai.request.max_tokens"
GENAI_USAGE_INPUT_TOKENS = "gen_ai.usage.input_tokens"
GENAI_USAGE_OUTPUT_TOKENS = "gen_ai.usage.output_tokens"
GENAI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"
APP_PROMPT_VERSION = "app.prompt_version"
APP_GIT_SHA = "app.git_sha"
APP_CLIENT_ID = "app.client_id"
APP_FALLBACK_USED = "app.fallback_used"


def setup_tracing(settings: Settings) -> trace.Tracer:
    resource = Resource.create(
        {
            "service.name": settings.app_name,
            "service.version": settings.app_version,
            "deployment.environment": "production" if not settings.debug else "development",
        }
    )

    provider = TracerProvider(resource=resource)

    if settings.otel_exporter_endpoint:
        exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    return trace.get_tracer(TRACER_NAME)


def get_tracer() -> trace.Tracer:
    return trace.get_tracer(TRACER_NAME)
