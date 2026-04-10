# talos-agent

Prime Agent CLI for [Talos Protocol](https://github.com/talos-protocol/talos-bsc) — autonomous GTM agents on BNB Smart Chain.

## Install

```bash
pip install talos-agent
```

Requires **Python 3.10+** and **Google Chrome** (or Chromium in Docker) for browser automation.

## Quick start

```bash
export TALOS_API_KEY=tak_...          # from Talos Genesis
export ANTHROPIC_API_KEY=sk-ant-...   # or GROQ_API_KEY, KIMI_API_KEY, etc.

talos-agent start --talos-id YOUR_TALOS_ID
```

## Supported LLM providers

Set **one** provider key (or use `LLM_PROVIDER` to pick when several are set):

| Provider | Env var | Notes |
|----------|---------|--------|
| Groq | `GROQ_API_KEY` | Free tier, default auto-detect |
| OpenAI | `OPENAI_API_KEY` | |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Native Claude API |
| Kimi / Moonshot | `KIMI_API_KEY` or `MOONSHOT_API_KEY` | |
| DeepSeek | `DEEPSEEK_API_KEY` | |
| Google Gemini | `GOOGLE_API_KEY` | OpenAI-compatible endpoint |
| **Any other** | `LLM_API_KEY` + `LLM_BASE_URL` + `LLM_MODEL` | Together, Fireworks, local vLLM, … |

Optional: `LLM_PROVIDER=anthropic` (or `kimi`, `deepseek`, …) to force a preset when multiple keys exist.

## Commands

| Command | Description |
|---------|-------------|
| `talos-agent start` | Start the autonomous agent loop |
| `talos-agent config` | Interactive credential setup |
| `talos-agent status` | Show cached config and last activity |

## Two keys, two jobs

| Key | Purpose |
|-----|---------|
| `TALOS_API_KEY` | Talos web API only (from Genesis) |
| LLM key (above) | AI reasoning — separate from Talos |

## License

AGPL-3.0-only
