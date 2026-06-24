"""X (Twitter) tools via official API — no browser required."""

from __future__ import annotations

from talos_agent.integrations.x_api import (
    XApiCredentials,
    credentials_configured,
    find_tweet_metrics,
    get_profile_stats,
    post_tweet,
)
from talos_agent.tools.registry import tool

_x_api_creds: XApiCredentials | None = None


def _require_x_api() -> dict | None:
    if credentials_configured(_x_api_creds):
        return None
    return {
        "error": (
            "X API credentials not configured. "
            "Add them in Talos Dashboard → TALOS Management → Integrations."
        )
    }


@tool("post_to_x", "Post a tweet on X (Twitter). Content MUST be under 280 characters, plain text only.")
async def post_to_x(content: str) -> dict:
    if len(content) > 280:
        return {"error": f"Post is {len(content)} chars — exceeds 280 char limit. Shorten it and try again."}
    err = _require_x_api()
    if err:
        return err
    return await post_tweet(content, _x_api_creds)  # type: ignore[arg-type]


@tool(
    "check_post_performance",
    "Check engagement metrics (likes, reposts, replies) for a recently posted tweet via X API.",
)
async def check_post_performance(content_snippet: str) -> dict:
    err = _require_x_api()
    if err:
        return err
    return await find_tweet_metrics(_x_api_creds, content_snippet)  # type: ignore[arg-type]


@tool(
    "get_profile_stats",
    "Get current X profile stats: follower count, following count, total posts.",
)
async def get_profile_stats_tool() -> dict:
    err = _require_x_api()
    if err:
        return err
    return await get_profile_stats(_x_api_creds)  # type: ignore[arg-type]
