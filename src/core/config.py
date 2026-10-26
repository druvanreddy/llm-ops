from __future__ import annotations

import subprocess
from functools import lru_cache

from pydantic_settings import BaseSettings


def _git_sha() -> str:
    try:
        return (
            subprocess.check_output(
                ["git", "rev-parse", "--short", "HEAD"],  # noqa: S607
                stderr=subprocess.DEVNULL,
            )
            .decode()
            .strip()
        )
    except Exception:
        return "unknown"


class Settings(BaseSettings):
    app_name: str = "llm-ops-triage"
    app_version: str = "0.1.0"
    git_sha: str = _git_sha()
    debug: bool = False

    # LLM providers
    primary_model: str = "gpt-4o-mini"
    fallback_model: str = "claude-haiku-5-5"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""

    # Gateway settings
    llm_timeout: int = 30
    llm_max_retries: int = 3
    llm_retry_min_wait: float = 1.0
    llm_retry_max_wait: float = 16.0

    # Circuit breaker
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_recovery_timeout: float = 30.0

    # Guardrails
    max_input_tokens: int = 4096
    max_output_tokens: int = 1024
    rate_limit_per_minute: int = 60

    # Prompt config
    active_prompt_version: str = "v1"
    prompts_dir: str = "prompts"

    # Observability
    otel_exporter_endpoint: str = "http://localhost:4317"
    langfuse_host: str = "http://localhost:3000"
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    prometheus_port: int = 9090

    # Eval
    golden_set_path: str = "data/golden_set"
    eval_accuracy_threshold: float = 2.0
    eval_latency_threshold: float = 15.0
    eval_cost_threshold: float = 15.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
