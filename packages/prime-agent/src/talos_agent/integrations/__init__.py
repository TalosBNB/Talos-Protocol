"""Load channel integrations from Talos Web."""

from __future__ import annotations

from dataclasses import dataclass

from talos_agent.integrations.x_api import XApiCredentials


@dataclass
class TalosIntegrations:
    x: XApiCredentials | None


def parse_integrations(data: dict | None) -> TalosIntegrations:
    if not data:
        return TalosIntegrations(x=None)
    x = data.get("x")
    if not x:
        return TalosIntegrations(x=None)
    return TalosIntegrations(
        x=XApiCredentials(
            api_key=x["apiKey"],
            api_key_secret=x["apiKeySecret"],
            access_token=x["accessToken"],
            access_token_secret=x["accessTokenSecret"],
        )
    )
