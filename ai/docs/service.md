# pv-ai — the Python AI/ML service

FastAPI service behind the server's AI and ML gateways (new architecture, R11/R13): LLM gateway with provider fallback, embeddings and vector search, ML models and the AI features. The desktop's direct AI mode does not use it.

## Run locally

```bash
cd ai
uv sync
uv run uvicorn pv_ai.app:app --reload --port 8200
```

Then `curl localhost:8200/healthz` → `{"ok":true}`. Tests: `uv run pytest -q`.

## Configuration

Environment variables `PV_AI_*` (see `.env.example`; a local `.env` file is read too):

| Variable | Meaning |
| --- | --- |
| `PV_AI_INTERNAL_TOKEN` | shared secret the gateways send in `x-pv-internal-token`; empty = every feature call is refused |
| `PV_AI_PROVIDER`, `PV_AI_MODEL`, `PV_AI_API_KEY`, `PV_AI_BASE_URL` | the LLM (`anthropic` or `openai` — any OpenAI-compatible server) |
| `PV_AI_FALLBACK_*` | a second provider, tried once after provider errors, rate limits or timeouts |
| `PV_AI_EMBED_*`, `PV_AI_VECTOR_STORE`, `PV_AI_QDRANT_URL`, `PV_AI_PINECONE_*` | semantic search (Qdrant by default; Pinecone only for the hosted cloud) |
| `PV_AI_MODELS_DIR` | where trained ML models are kept (default `~/.pv_ai_models`) |
| `PV_AI_PROMPTS_DIR` | prompt templates (default: `contracts/prompts/v2` of this repository) |

## Adding a feature

Create `pv_ai/features/<name>/router.py` exposing `router` (a FastAPI `APIRouter`). The app finds it at start-up and protects every route with the internal token. Use `Depends(get_provider)` for the LLM so tests can swap in `FakeProvider`; stream answers with `pv_ai.core.sse.stream_response`.

## Security

Internal only: the service is never exposed through the public gateway. Request bodies (code facts) are not logged. Errors always use `{"error": {"code", "message"}}`.
