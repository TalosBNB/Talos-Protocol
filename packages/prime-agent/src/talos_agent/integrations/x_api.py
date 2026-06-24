"""Post to X and read metrics via official API (OAuth 1.0a user context)."""

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


def _oauth1(creds: XApiCredentials) -> OAuth1:
    return OAuth1(
        creds.api_key,
        creds.api_key_secret,
        creds.access_token,
        creds.access_token_secret,
    )


def _get_json(url: str, creds: XApiCredentials, *, params: dict | None = None) -> tuple[int, dict]:
    r = requests.get(url, auth=_oauth1(creds), params=params, timeout=30)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    return r.status_code, body


async def post_tweet(text: str, creds: XApiCredentials) -> dict:
    if len(text) > 280:
        return {"error": f"Post is {len(text)} chars — max 280."}

    def _post() -> tuple[int, dict]:
        r = requests.post(
            "https://api.twitter.com/2/tweets",
            json={"text": text},
            auth=_oauth1(creds),
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


async def get_profile_stats(creds: XApiCredentials) -> dict:
    def _fetch() -> tuple[int, dict]:
        return _get_json(
            "https://api.twitter.com/2/users/me",
            creds,
            params={"user.fields": "public_metrics,username"},
        )

    status, body = await asyncio.to_thread(_fetch)
    if status != 200:
        detail = body.get("detail") or body.get("title") or str(body)
        return {"error": f"X API error ({status}): {detail}"}

    user = body.get("data", {})
    metrics = user.get("public_metrics", {})
    return {
        "username": user.get("username"),
        "followers": metrics.get("followers_count", 0),
        "following": metrics.get("following_count", 0),
        "total_posts": metrics.get("tweet_count", 0),
    }


async def find_tweet_metrics(creds: XApiCredentials, content_snippet: str) -> dict:
    snippet = content_snippet.strip()[:80]

    def _fetch() -> tuple[int, dict]:
        return _get_json(
            "https://api.twitter.com/2/users/me/tweets",
            creds,
            params={
                "max_results": 10,
                "tweet.fields": "public_metrics,created_at",
            },
        )

    status, body = await asyncio.to_thread(_fetch)
    if status != 200:
        detail = body.get("detail") or body.get("title") or str(body)
        return {"error": f"X API error ({status}): {detail}", "found": False}

    for tweet in body.get("data", []):
        text = tweet.get("text", "")
        if snippet and snippet.lower() not in text.lower():
            continue
        metrics = tweet.get("public_metrics", {})
        tweet_id = tweet.get("id")
        return {
            "found": True,
            "likes": metrics.get("like_count", 0),
            "reposts": metrics.get("retweet_count", 0),
            "replies": metrics.get("reply_count", 0),
            "impressions": 0,
            "tweet_url": f"https://x.com/i/web/status/{tweet_id}" if tweet_id else "",
        }

    return {"found": False}
