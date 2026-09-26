# Build context = repository root (the prompt templates live in contracts/).
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY ai/pyproject.toml ai/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY ai/pv_ai ./pv_ai
RUN uv sync --frozen --no-dev
COPY contracts/prompts /prompts
ENV PV_AI_PROMPTS_DIR=/prompts/v2
EXPOSE 8200
CMD ["uv", "run", "--no-dev", "uvicorn", "pv_ai.app:app", "--host", "0.0.0.0", "--port", "8200"]
