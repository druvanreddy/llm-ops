from __future__ import annotations

import logging
import re
import time
import uuid

from opentelemetry import trace

from src.core.config import Settings
from src.core.schemas import ResponseMetadata, TriageResponse
from src.gateway.llm_gateway import LLMGateway
from src.observability.metrics import LLMMetrics
from src.observability.tracing import (
    APP_FALLBACK_USED,
    APP_GIT_SHA,
    APP_PROMPT_VERSION,
    GENAI_REQUEST_MAX_TOKENS,
    GENAI_REQUEST_MODEL,
    GENAI_REQUEST_TEMPERATURE,
    GENAI_USAGE_INPUT_TOKENS,
    GENAI_USAGE_OUTPUT_TOKENS,
)
from src.prompts.registry import PromptRegistry

logger = logging.getLogger(__name__)

_INJECTION_PATTERNS = re.compile(
    r"(ignore\s+(all\s+)?previous\s+instructions"
    r"|you\s+are\s+now\s+a"
    r"|system\s*:\s*"
    r"|<\|im_start\|>"
    r"|<\|endoftext\|>"
    r"|```\s*system)",
    re.IGNORECASE,
)


def _sanitize_input(text: str) -> str:
    text = text.replace("\x00", "")
    if _INJECTION_PATTERNS.search(text):
        logger.warning("Potential prompt injection detected, stripping markers")
        text = _INJECTION_PATTERNS.sub("[filtered]", text)
    return text


class TriageService:
    def __init__(
        self,
        settings: Settings,
        gateway: LLMGateway,
        registry: PromptRegistry,
        metrics: LLMMetrics,
    ) -> None:
        self._settings = settings
        self._gateway = gateway
        self._registry = registry
        self._metrics = metrics
        self._tracer = trace.get_tracer("llm-ops-triage")

    async def triage(
        self,
        ticket_text: str,
        client_id: str = "anonymous",
        prompt_version: str | None = None,
    ) -> TriageResponse:
        request_id = uuid.uuid4().hex[:16]
        ticket_text = _sanitize_input(ticket_text)
        start = time.perf_counter()

        with self._tracer.start_as_current_span("triage_request") as span:
            span.set_attribute("app.request_id", request_id)
            span.set_attribute("app.client_id", client_id)
            span.set_attribute(APP_GIT_SHA, self._settings.git_sha)

            with self._tracer.start_as_current_span("load_prompt"):
                version = prompt_version or self._settings.active_prompt_version
                prompt_config = self._registry.load("triage", version)
                span.set_attribute(APP_PROMPT_VERSION, prompt_config.version)
                span.set_attribute(GENAI_REQUEST_MODEL, prompt_config.model)
                span.set_attribute(GENAI_REQUEST_TEMPERATURE, prompt_config.temperature)
                span.set_attribute(GENAI_REQUEST_MAX_TOKENS, prompt_config.max_tokens)

            with self._tracer.start_as_current_span("render_prompt"):
                system_prompt, user_prompt = self._registry.render(
                    prompt_config, {"ticket_text": ticket_text}
                )

            with self._tracer.start_as_current_span("llm_call") as llm_span:
                call_result = await self._gateway.call(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=prompt_config.model,
                    temperature=prompt_config.temperature,
                    max_tokens=prompt_config.max_tokens,
                )

                llm_span.set_attribute(GENAI_USAGE_INPUT_TOKENS, call_result.input_tokens)
                llm_span.set_attribute(GENAI_USAGE_OUTPUT_TOKENS, call_result.output_tokens)
                llm_span.set_attribute(APP_FALLBACK_USED, call_result.fallback_used)

            elapsed_s = time.perf_counter() - start
            elapsed_ms = elapsed_s * 1000

            schema_attempt = "repair" if call_result.repair_attempted else "first"
            self._metrics.record_schema_valid(schema_attempt)
            self._metrics.record_request(
                status="success",
                model=call_result.model,
                prompt_version=prompt_config.version,
                duration_s=elapsed_s,
            )
            self._metrics.record_cost(call_result.cost_usd, call_result.model)

            if call_result.fallback_used:
                self._metrics.record_fallback(
                    self._settings.primary_model, call_result.model
                )

            return TriageResponse(
                result=call_result.result,
                metadata=ResponseMetadata(
                    request_id=request_id,
                    prompt_version=prompt_config.version,
                    model=call_result.model,
                    git_sha=self._settings.git_sha,
                    latency_ms=elapsed_ms,
                    input_tokens=call_result.input_tokens,
                    output_tokens=call_result.output_tokens,
                    cost_usd=call_result.cost_usd,
                    provider=call_result.provider,
                    fallback_used=call_result.fallback_used,
                ),
            )
