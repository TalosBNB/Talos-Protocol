"""Multi-provider LLM client — OpenAI-compatible APIs + Anthropic Claude."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI

from talos_agent.config import LLMProfile


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class LLMResponse:
    content: str | None
    tool_calls: list[ToolCall]


def _openai_tools_to_anthropic(tools: list[dict]) -> list[dict]:
    out: list[dict] = []
    for tool in tools:
        fn = tool.get("function", {})
        out.append(
            {
                "name": fn.get("name", ""),
                "description": fn.get("description", ""),
                "input_schema": fn.get("parameters") or {"type": "object", "properties": {}},
            }
        )
    return out


def _split_openai_messages(messages: list[dict]) -> tuple[str | None, list[dict]]:
    system_parts: list[str] = []
    rest: list[dict] = []
    for msg in messages:
        if msg.get("role") == "system":
            content = msg.get("content")
            if content:
                system_parts.append(str(content))
        else:
            rest.append(msg)
    system = "\n\n".join(system_parts) if system_parts else None
    return system, rest


def _openai_messages_to_anthropic(messages: list[dict]) -> list[dict]:
    anthropic: list[dict] = []
    for msg in messages:
        role = msg.get("role")
        if role == "user":
            anthropic.append({"role": "user", "content": msg.get("content") or ""})
        elif role == "assistant":
            blocks: list[dict] = []
            if msg.get("content"):
                blocks.append({"type": "text", "text": str(msg["content"])})
            for tc in msg.get("tool_calls") or []:
                fn = tc.get("function", {})
                try:
                    args = json.loads(fn.get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}
                blocks.append(
                    {
                        "type": "tool_use",
                        "id": tc.get("id") or f"tool_{uuid.uuid4().hex[:8]}",
                        "name": fn.get("name", ""),
                        "input": args,
                    }
                )
            anthropic.append({"role": "assistant", "content": blocks or ""})
        elif role == "tool":
            anthropic.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.get("tool_call_id", ""),
                            "content": msg.get("content") or "",
                        }
                    ],
                }
            )
    return anthropic


class LLMClient:
    """Unified chat + tool-calling across providers."""

    def __init__(self, profile: LLMProfile):
        self._profile = profile
        self._openai: AsyncOpenAI | None = None
        self._anthropic = None

    @classmethod
    def from_profile(cls, profile: LLMProfile) -> LLMClient:
        return cls(profile)

    def _openai_client(self) -> AsyncOpenAI:
        if self._openai is None:
            kwargs: dict[str, Any] = {"api_key": self._profile.api_key}
            if self._profile.base_url:
                kwargs["base_url"] = self._profile.base_url
            self._openai = AsyncOpenAI(**kwargs)
        return self._openai

    def _anthropic_client(self):
        if self._anthropic is None:
            from anthropic import AsyncAnthropic

            self._anthropic = AsyncAnthropic(api_key=self._profile.api_key)
        return self._anthropic

    async def chat(
        self,
        *,
        messages: list[dict],
        tools: list[dict] | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        if self._profile.provider == "anthropic":
            return await self._chat_anthropic(messages=messages, tools=tools, json_mode=json_mode)
        return await self._chat_openai_compatible(messages=messages, tools=tools, json_mode=json_mode)

    async def _chat_openai_compatible(
        self,
        *,
        messages: list[dict],
        tools: list[dict] | None,
        json_mode: bool,
    ) -> LLMResponse:
        client = self._openai_client()
        kwargs: dict[str, Any] = {
            "model": self._profile.model,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await client.chat.completions.create(**kwargs)
        msg = response.choices[0].message
        tool_calls = [
            ToolCall(
                id=tc.id,
                name=tc.function.name,
                arguments=tc.function.arguments or "{}",
            )
            for tc in (msg.tool_calls or [])
        ]
        return LLMResponse(content=msg.content, tool_calls=tool_calls)

    async def _chat_anthropic(
        self,
        *,
        messages: list[dict],
        tools: list[dict] | None,
        json_mode: bool,
    ) -> LLMResponse:
        client = self._anthropic_client()
        system, anthropic_messages = _split_openai_messages(messages)
        if json_mode and system:
            system = f"{system}\n\nRespond with valid JSON only."
        elif json_mode:
            system = "Respond with valid JSON only."

        kwargs: dict[str, Any] = {
            "model": self._profile.model,
            "max_tokens": 4096,
            "messages": _openai_messages_to_anthropic(anthropic_messages),
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = _openai_tools_to_anthropic(tools)

        response = await client.messages.create(**kwargs)

        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=json.dumps(block.input),
                    )
                )

        content = "\n".join(text_parts) if text_parts else None
        return LLMResponse(content=content, tool_calls=tool_calls)


_clients: dict[tuple[str, str, str | None], LLMClient] = {}


def get_llm_client(profile: LLMProfile) -> LLMClient:
    key = (profile.provider, profile.api_key[:12], profile.base_url)
    if key not in _clients:
        _clients[key] = LLMClient.from_profile(profile)
    return _clients[key]
