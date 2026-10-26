from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.api.triage import TriageService
from src.core.config import Settings, get_settings
from src.core.database import (
    check_escalation,
    clear_history,
    delete_by_ids,
    delete_rule,
    export_history,
    get_analytics,
    get_history,
    get_rules,
    get_stats,
    init_db,
    save_rule,
    save_triage,
    set_feedback,
    toggle_rule,
)
from src.core.schemas import (
    ABTestRequest,
    BulkTriageRequest,
    DeleteHistoryRequest,
    ErrorResponse,
    FeedbackRequest,
    HealthResponse,
    ReadinessResponse,
    RuleCreateRequest,
    RuleToggleRequest,
    TriageRequest,
    TriageResponse,
)
from src.eval.harness import EvalHarness
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


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        if not request.url.path.startswith(("/healthz", "/readyz", "/metrics")):
            logger.info(
                "request method=%s path=%s status=%d latency_ms=%.1f",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        return response


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

    init_db()

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
        "Production LLM service with versioned prompts, eval-gated CI/CD, and provider failover"
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
app.add_middleware(RequestLoggingMiddleware)


@app.get("/healthz", response_model=HealthResponse, tags=["ops"])
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:  # noqa: B008
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        git_sha=settings.git_sha,
    )


@app.get("/readyz", response_model=ReadinessResponse, tags=["ops"])
async def readiness(
    request: Request,
    settings: Settings = Depends(get_settings),  # noqa: B008
) -> ReadinessResponse:
    checks: dict[str, bool] = {}

    try:
        registry.load("triage", settings.active_prompt_version)
        checks["prompt_loaded"] = True
    except Exception:
        checks["prompt_loaded"] = False

    has_any_key = bool(
        settings.openai_api_key or settings.anthropic_api_key or settings.groq_api_key
    )
    checks["primary_model_configured"] = has_any_key
    checks["fallback_model_configured"] = has_any_key

    try:
        from src.core.database import _get_conn

        with _get_conn() as conn:
            conn.execute("SELECT 1").fetchone()
        checks["database"] = True
    except Exception:
        checks["database"] = False

    gateway = getattr(request.app.state, "gateway", None)
    if gateway:
        checks["primary_circuit_breaker"] = gateway._primary_breaker.is_available
        checks["fallback_circuit_breaker"] = gateway._fallback_breaker.is_available
    else:
        checks["primary_circuit_breaker"] = False
        checks["fallback_circuit_breaker"] = False

    all_ready = all(checks.values())
    return ReadinessResponse(
        status="ready" if all_ready else "not_ready",
        checks=checks,
    )


@app.get("/api/v1/prompt-versions", tags=["triage"])
async def list_prompt_versions(request: Request) -> dict:
    settings: Settings = request.app.state.settings
    versions = registry.list_versions("triage")
    return {
        "versions": versions,
        "active": settings.active_prompt_version,
    }


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
        response = await service.triage(
            body.ticket_text, body.client_id, prompt_version=body.prompt_version
        )
        lang = response.result.detected_language or "en"
        request_id = response.metadata.request_id
        row_id = save_triage(
            body.ticket_text, response.model_dump(), language=lang, request_id=request_id
        )
        # Check escalation rules
        triggered = check_escalation(
            response.result.priority.value,
            response.result.category.value,
        )
        result = response.model_dump()
        result["db_id"] = row_id
        if triggered:
            result["escalations"] = [
                {"name": r["name"], "action": r["action"], "target": r["target"]} for r in triggered
            ]
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Triage request failed: %s", exc)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable") from exc


# --- History endpoints ---


@app.get("/api/v1/history", tags=["history"])
async def list_history() -> list[dict]:
    return get_history()


@app.get("/api/v1/stats", tags=["analytics"])
async def stats() -> dict:
    return get_stats()


@app.get("/api/v1/analytics", tags=["analytics"])
async def analytics() -> dict:
    return get_analytics()


@app.post("/api/v1/history/delete", tags=["history"])
async def delete_history_items(body: DeleteHistoryRequest) -> dict:
    if not body.ids:
        return {"deleted": 0}
    count = delete_by_ids(body.ids)
    return {"deleted": count}


@app.delete("/api/v1/history", tags=["history"])
async def delete_history() -> dict:
    count = clear_history()
    return {"deleted": count}


# --- Feedback ---


@app.post("/api/v1/feedback", tags=["feedback"])
async def submit_feedback(body: FeedbackRequest) -> dict:
    ok = set_feedback(body.id, body.feedback)
    return {"ok": ok}


# --- Export ---


@app.get("/api/v1/export/{fmt}", tags=["export"])
async def export_data(fmt: str) -> Response:
    if fmt not in ("json", "csv"):
        raise HTTPException(status_code=422, detail="Format must be json or csv")
    data = export_history(fmt)
    media = "text/csv" if fmt == "csv" else "application/json"
    filename = f"triage_history.{fmt}"
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# --- Bulk triage ---


@app.post("/api/v1/bulk-triage", tags=["triage"])
async def bulk_triage(request: Request, body: BulkTriageRequest) -> dict:
    import asyncio

    service: TriageService = request.app.state.service
    semaphore = asyncio.Semaphore(5)

    async def process_one(ticket_text: str) -> dict:
        async with semaphore:
            try:
                response = await service.triage(ticket_text, prompt_version=body.prompt_version)
                save_triage(ticket_text, response.model_dump())
                return {"text": ticket_text, "result": response.model_dump(), "error": None}
            except Exception as exc:
                return {"text": ticket_text, "result": None, "error": str(exc)}

    results = await asyncio.gather(*[process_one(t) for t in body.tickets])
    return {
        "results": results,
        "total": len(results),
        "success": sum(1 for r in results if r["result"]),
    }


# --- Escalation rules ---


@app.get("/api/v1/rules", tags=["rules"])
async def list_rules() -> list[dict]:
    return get_rules()


@app.post("/api/v1/rules", tags=["rules"])
async def create_rule(body: RuleCreateRequest) -> dict:
    rule_id = save_rule(
        name=body.name,
        priority=body.priority,
        category=body.category,
        action=body.action,
        target=body.target,
    )
    return {"id": rule_id}


@app.delete("/api/v1/rules/{rule_id}", tags=["rules"])
async def remove_rule(rule_id: int) -> dict:
    return {"ok": delete_rule(rule_id)}


@app.post("/api/v1/rules/{rule_id}/toggle", tags=["rules"])
async def toggle_rule_endpoint(rule_id: int, body: RuleToggleRequest) -> dict:
    return {"ok": toggle_rule(rule_id, body.enabled)}


# --- A/B Prompt Testing ---


@app.post("/api/v1/ab-test", tags=["triage"])
async def ab_test(request: Request, body: ABTestRequest) -> dict:
    import asyncio

    service: TriageService = request.app.state.service

    async def run_version(version: str) -> dict:
        try:
            resp = await service.triage(body.ticket_text, prompt_version=version)
            return {"version": version, "result": resp.model_dump(), "error": None}
        except Exception as exc:
            return {"version": version, "result": None, "error": str(exc)}

    a_result, b_result = await asyncio.gather(
        run_version(body.version_a), run_version(body.version_b)
    )
    return {"a": a_result, "b": b_result}


# --- Eval ---


@app.post("/api/v1/eval", tags=["eval"])
async def run_eval(request: Request) -> dict:
    settings: Settings = request.app.state.settings
    try:
        harness = EvalHarness(settings)
        result = await harness.run(split="test")
        return result.model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Eval run failed: %s", exc)
        raise HTTPException(status_code=500, detail="Eval run failed") from exc


@app.post("/api/v1/eval/dev", tags=["eval"])
async def run_eval_dev(request: Request) -> dict:
    settings: Settings = request.app.state.settings
    try:
        harness = EvalHarness(settings)
        result = await harness.run(split="dev")
        return result.model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Eval run failed: %s", exc)
        raise HTTPException(status_code=500, detail="Eval run failed") from exc


# --- Metrics ---


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
