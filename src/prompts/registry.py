from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from jinja2 import BaseLoader, Environment
from pydantic import BaseModel


class PromptConfig(BaseModel):
    version: str
    model: str
    temperature: float = 0.0
    max_tokens: int = 1024
    system_template: str
    user_template: str
    response_format: dict[str, Any] | None = None


class PromptRegistry:
    def __init__(self, prompts_dir: str = "prompts") -> None:
        self._prompts_dir = Path(prompts_dir)
        self._cache: dict[str, PromptConfig] = {}
        self._jinja_env = Environment(loader=BaseLoader(), autoescape=False)  # noqa: S701

    def load(self, workload: str, version: str) -> PromptConfig:
        cache_key = f"{workload}/{version}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        path = self._prompts_dir / workload / f"{version}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"Prompt not found: {path}")

        with open(path) as f:
            raw = yaml.safe_load(f)

        config = PromptConfig(
            version=raw["version"],
            model=raw.get("model", "gpt-4o-mini"),
            temperature=raw.get("temperature", 0.0),
            max_tokens=raw.get("max_tokens", 1024),
            system_template=raw["system_template"],
            user_template=raw["user_template"],
            response_format=raw.get("response_format"),
        )
        self._cache[cache_key] = config
        return config

    def render(self, config: PromptConfig, variables: dict[str, Any]) -> tuple[str, str]:
        system = self._jinja_env.from_string(config.system_template).render(**variables)
        user = self._jinja_env.from_string(config.user_template).render(**variables)
        return system, user

    def list_versions(self, workload: str) -> list[str]:
        workload_dir = self._prompts_dir / workload
        if not workload_dir.exists():
            return []
        return sorted(p.stem for p in workload_dir.glob("v*.yaml"))

    def clear_cache(self) -> None:
        self._cache.clear()
