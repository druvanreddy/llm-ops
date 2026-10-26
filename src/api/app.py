from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.responses import Response

from src.api.triage import TriageService
from src.core.config import Settings, get_settings
from src.core.schemas import (
    ErrorResponse,
    HealthResponse,
    ReadinessResponse,
    TriageRequest,
    TriageResponse,
)
from src.gateway.llm_gateway import LLMGateway
from src.observability.metrics import LLMMetrics
from src.observability.tracing import setup_tracing
from src.prompts.registry import PromptRegistry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

metrics = LLMMetrics()
registry = PromptRegistry()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()

    setup_tracing(settings)

    gateway = LLMGateway(settings, metrics)
    service = TriageService(settings, gateway, registry, metrics)

    metrics.app_info.info(
        {
            "version": settings.app_version,
            "git_sha": settings.git_sha,
            "primary_model": settings.primary_model,
            "fallback_model": settings.fallback_model,
            "active_prompt_version": settings.active_prompt_version,
        }
    )

    app.state.settings = settings
    app.state.service = service
    app.state.gateway = gateway

    logger.info(
        "Service started: version=%s git_sha=%s prompt=%s models=%s/%s",
        settings.app_version,
        settings.git_sha,
        settings.active_prompt_version,
        settings.primary_model,
        settings.fallback_model,
    )
    yield


app = FastAPI(
    title="LLM Ops — Support Ticket Triage API",
    description=(
        "Production LLM service with versioned prompts, "
        "eval-gated CI/CD, and provider failover"
    ),
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=HealthResponse, tags=["ops"])
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:  # noqa: B008
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        git_sha=settings.git_sha,
    )


@app.get("/readyz", response_model=ReadinessResponse, tags=["ops"])
async def readiness(settings: Settings = Depends(get_settings)) -> ReadinessResponse:  # noqa: B008
    checks: dict[str, bool] = {}

    try:
        registry.load("triage", settings.active_prompt_version)
        checks["prompt_loaded"] = True
    except Exception:
        checks["prompt_loaded"] = False

    checks["primary_model_configured"] = bool(settings.openai_api_key)
    checks["fallback_model_configured"] = bool(settings.anthropic_api_key)

    all_ready = all(checks.values())
    return ReadinessResponse(
        status="ready" if all_ready else "not_ready",
        checks=checks,
    )


@app.post(
    "/api/v1/triage",
    response_model=TriageResponse,
    responses={
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    tags=["triage"],
)
@limiter.limit("60/minute")
async def triage_ticket(
    request: Request,
    body: TriageRequest,
) -> TriageResponse:
    service: TriageService = request.app.state.service
    settings: Settings = request.app.state.settings

    input_length = len(body.ticket_text)
    if input_length > settings.max_input_tokens * 4:
        raise HTTPException(
            status_code=422,
            detail=f"Input too long: ~{input_length // 4} tokens (max {settings.max_input_tokens})",
        )

    try:
        return await service.triage(body.ticket_text, body.client_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Triage request failed")
        msg = f"Service unavailable: {type(exc).__name__}"
        raise HTTPException(status_code=503, detail=msg) from exc


@app.get("/metrics", tags=["ops"], include_in_schema=False)
async def prometheus_metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.exception_handler(429)
async def rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content=ErrorResponse(
            error="Rate limit exceeded",
            error_class="rate_limit",
            detail="Try again later",
        ).model_dump(),
        headers={"Retry-After": "60"},
    )
