"""Post to X via official API (OAuth 1.0a user context)."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

import requests
from requests_oauthlib import OAuth1


@dataclass
class XApiCredentials:
    api_key: str
    api_key_secret: str
    access_token: str
    access_token_secret: str


def credentials_configured(creds: XApiCredentials | None) -> bool:
    if not creds:
        return False
    return bool(creds.api_key and creds.api_key_secret and creds.access_token and creds.access_token_secret)


async def post_tweet(text: str, creds: XApiCredentials) -> dict:
    if len(text) > 280:
        return {"error": f"Post is {len(text)} chars — max 280."}

    def _post() -> tuple[int, dict]:
        auth = OAuth1(
            creds.api_key,
            creds.api_key_secret,
            creds.access_token,
            creds.access_token_secret,
        )
        r = requests.post(
            "https://api.twitter.com/2/tweets",
            json={"text": text},
            auth=auth,
            timeout=30,
        )
        try:
            body = r.json()
        except Exception:
            body = {"raw": r.text}
        return r.status_code, body

    status, body = await asyncio.to_thread(_post)
    if status in (200, 201):
        tweet_id = body.get("data", {}).get("id")
        return {"status": "posted", "content": text, "channel": "X", "tweet_id": tweet_id}
    detail = body.get("detail") or body.get("title") or str(body)
    return {"error": f"X API error ({status}): {detail}"}
