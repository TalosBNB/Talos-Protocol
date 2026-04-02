"""Core agent loop — ReAct tool-calling with multi-provider LLM support."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from rich.console import Console

from talos_agent.agent.context import AgentContext
from talos_agent.agent.llm import get_llm_client
from talos_agent.agent.prompt import build_system_prompt

if TYPE_CHECKING:
    from talos_agent.config import Settings
    from talos_agent.db import LocalDB
    from talos_agent.tools.registry import ToolRegistry

console = Console()


async def agent_loop(
    settings: Settings,
    tools: ToolRegistry,
    talos_config: dict,
    context: AgentContext,
    db: LocalDB,
    system_prompt_override: str | None = None,
    shutdown_event=None,
) -> list[dict]:
    """Run one agent cycle: LLM decides tools to call until done."""
    profile = settings.llm_profile
    if not profile:
        console.print("[red]No LLM configured.[/red]")
        return []

    client = get_llm_client(profile)
    system_prompt = system_prompt_override or build_system_prompt(talos_config, context)
    tool_schemas = tools.openai_schemas()

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Decide and execute your next actions based on the current context."},
    ]

    for iteration in range(settings.max_iterations):
        if shutdown_event and shutdown_event.is_set():
            console.print("[yellow]Shutdown requested — aborting agent loop.[/yellow]")
            break

        console.print(f"[dim]Agent iteration {iteration + 1}...[/dim]")

        response = await client.chat(
            messages=messages,
            tools=tool_schemas if tool_schemas else None,
        )

        assistant_msg: dict = {"role": "assistant"}
        if response.content:
            assistant_msg["content"] = response.content
            console.print(f"[blue]Agent:[/blue] {response.content[:200]}")
        if response.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.name, "arguments": tc.arguments},
                }
                for tc in response.tool_calls
            ]
        messages.append(assistant_msg)

        if not response.tool_calls:
            console.print("[green]Agent cycle complete — no more actions.[/green]")
            break

        for tc in response.tool_calls:
            fn_name = tc.name
            try:
                args = json.loads(tc.arguments)
            except json.JSONDecodeError:
                args = {}

            console.print(f"[yellow]Tool:[/yellow] {fn_name}({_truncate_args(args)})")

            result = await tools.execute(fn_name, args)
            result_str = json.dumps(result, default=str, ensure_ascii=False)

            console.print(f"[dim]Result:[/dim] {result_str[:200]}")

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_str,
            })
    else:
        console.print("[yellow]Agent hit max iterations limit.[/yellow]")

    return messages


def _truncate_args(args: dict) -> str:
    parts = []
    for k, v in args.items():
        s = str(v)
        if len(s) > 50:
            s = s[:47] + "..."
        parts.append(f"{k}={s!r}")
    return ", ".join(parts)
