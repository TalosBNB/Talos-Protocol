"""Configuration via environment variables and ~/.talos-agent/config.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path.home() / ".talos-agent"

# Built-in provider presets (OpenAI-compatible unless noted).
PROVIDER_PRESETS: dict[str, dict[str, str | None]] = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
        "key_env": "GROQ_API_KEY",
    },
    "openai": {
        "base_url": None,
        "default_model": "gpt-4o-mini",
        "key_env": "OPENAI_API_KEY",
    },
    "anthropic": {
        "base_url": None,
        "default_model": "claude-sonnet-4-20250514",
        "key_env": "ANTHROPIC_API_KEY",
    },
    "moonshot": {
        "base_url": "https://api.moonshot.cn/v1",
        "default_model": "moonshot-v1-8k",
        "key_env": "MOONSHOT_API_KEY",
    },
    "kimi": {
        "base_url": "https://api.moonshot.cn/v1",
        "default_model": "moonshot-v1-8k",
        "key_env": "KIMI_API_KEY",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-chat",
        "key_env": "DEEPSEEK_API_KEY",
    },
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "default_model": "gemini-2.0-flash",
        "key_env": "GOOGLE_API_KEY",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "default_model": "gemini-2.0-flash",
        "key_env": "GEMINI_API_KEY",
    },
}


@dataclass(frozen=True)
class LLMProfile:
    provider: str
    api_key: str
    model: str
    base_url: str | None


def _json_config_source() -> dict:
    path = APP_DIR / "config.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Talos Web API
    talos_api_url: str = "https://talos-bsc.vercel.app"
    talos_api_key: str = ""
    talos_id: str = ""

    # BNB Smart Chain
    bsc_rpc_url: str = "https://bsc-dataseed.binance.org"
    bsc_chain_id: int = 56
    x402_network: str = "eip155:56"

    talos_api_keys: str = ""

    # ── LLM (multi-provider) ───────────────────────────────────────────────
    llm_provider: str = ""
    custom_llm_key: str = Field(default="", validation_alias="LLM_API_KEY")
    custom_llm_base_url: str = Field(default="", validation_alias="LLM_BASE_URL")
    custom_llm_model: str = Field(default="", validation_alias="LLM_MODEL")

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    moonshot_api_key: str = ""
    kimi_api_key: str = ""
    moonshot_model: str = "moonshot-v1-8k"
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    google_api_key: str = ""
    gemini_api_key: str = ""
    google_model: str = "gemini-2.0-flash"

    # X (Twitter)
    x_username: str = ""
    x_password: str = ""
    x_email: str = ""

    agent_cycle_interval: int = Field(default=30, description="Seconds between agent cycles")
    polling_interval: int = Field(default=10, description="Seconds between API polls")
    heartbeat_interval: int = Field(default=60, description="Seconds between heartbeats")
    max_iterations: int = Field(default=20, description="Max tool-call iterations per cycle")
    approval_threshold: Decimal = Field(default=Decimal("10"), description="USD threshold for auto-approval")
    browser_headless: bool = Field(default=False, description="Run browser in headless mode")

    def __init__(self, **kwargs):
        overrides = _json_config_source()
        overrides.update(kwargs)
        super().__init__(**overrides)

    def get_all_api_keys(self) -> list[str]:
        if self.talos_api_keys:
            return [k.strip() for k in self.talos_api_keys.split(",") if k.strip()]
        if self.talos_api_key:
            return [self.talos_api_key]
        return []

    def resolve_llm(self) -> LLMProfile | None:
        """Pick the first configured LLM provider."""
        provider = self.llm_provider.strip().lower()

        # Explicit generic OpenAI-compatible override
        if self.custom_llm_key:
            return LLMProfile(
                provider=provider or "custom",
                api_key=self.custom_llm_key,
                model=self.custom_llm_model or "gpt-4o-mini",
                base_url=self.custom_llm_base_url or None,
            )

        if provider:
            return self._profile_for_provider(provider)

        # Auto-detect (legacy order preserved)
        for name in ("groq", "anthropic", "moonshot", "kimi", "deepseek", "google", "gemini", "openai"):
            profile = self._profile_for_provider(name)
            if profile:
                return profile
        return None

    def _profile_for_provider(self, name: str) -> LLMProfile | None:
        preset = PROVIDER_PRESETS.get(name)
        if not preset:
            return None

        key = self._provider_api_key(name, str(preset["key_env"]))
        if not key:
            return None

        model = self.custom_llm_model or self._provider_model(name) or str(preset["default_model"])
        base_url = self.custom_llm_base_url or preset["base_url"]
        if isinstance(base_url, str) and not base_url:
            base_url = None

        return LLMProfile(provider=name, api_key=key, model=model, base_url=base_url)

    def _provider_api_key(self, name: str, key_env: str) -> str:
        mapping = {
            "groq": self.groq_api_key,
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "moonshot": self.moonshot_api_key,
            "kimi": self.kimi_api_key,
            "deepseek": self.deepseek_api_key,
            "google": self.google_api_key or self.gemini_api_key,
            "gemini": self.gemini_api_key or self.google_api_key,
        }
        return mapping.get(name, "")

    def _provider_model(self, name: str) -> str:
        mapping = {
            "groq": self.groq_model,
            "openai": self.openai_model,
            "anthropic": self.anthropic_model,
            "moonshot": self.moonshot_model,
            "kimi": self.moonshot_model,
            "deepseek": self.deepseek_model,
            "google": self.google_model,
            "gemini": self.google_model,
        }
        return mapping.get(name, "")

    @property
    def llm_profile(self) -> LLMProfile | None:
        return self.resolve_llm()

    @property
    def llm_api_key(self) -> str:
        """Resolved LLM API key (also passed to Stagehand browser automation)."""
        return self.llm_profile.api_key if self.llm_profile else ""

    @property
    def llm_model(self) -> str:
        return self.llm_profile.model if self.llm_profile else ""

    @property
    def llm_base_url(self) -> str | None:
        return self.llm_profile.base_url if self.llm_profile else None


def ensure_app_dir() -> Path:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    (APP_DIR / "logs").mkdir(exist_ok=True)
    return APP_DIR
