import pytest

from src.prompts.registry import PromptRegistry


class TestPromptRegistry:
    def test_load_valid_prompt(self) -> None:
        registry = PromptRegistry("prompts")
        config = registry.load("triage", "v1")
        assert config.version == "v1"
        assert config.model == "gpt-4o-mini"
        assert config.temperature == 0.0
        assert "customer support" in config.system_template.lower()

    def test_load_nonexistent_prompt_raises(self) -> None:
        registry = PromptRegistry("prompts")
        with pytest.raises(FileNotFoundError):
            registry.load("triage", "v999")

    def test_render_template(self) -> None:
        registry = PromptRegistry("prompts")
        config = registry.load("triage", "v1")
        system, user = registry.render(config, {"ticket_text": "Test ticket"})
        assert "Test ticket" in user
        assert "JSON" in system

    def test_list_versions(self) -> None:
        registry = PromptRegistry("prompts")
        versions = registry.list_versions("triage")
        assert "v1" in versions

    def test_cache_works(self) -> None:
        registry = PromptRegistry("prompts")
        config1 = registry.load("triage", "v1")
        config2 = registry.load("triage", "v1")
        assert config1 is config2

    def test_clear_cache(self) -> None:
        registry = PromptRegistry("prompts")
        registry.load("triage", "v1")
        registry.clear_cache()
        assert len(registry._cache) == 0
