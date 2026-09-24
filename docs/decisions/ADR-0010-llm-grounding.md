# ADR-0010: LLM providers and grounding

## Status

Accepted

## Date

2026-09-24

## Context

AI answers must be correct and affordable.

## Decision

A provider abstraction (Anthropic + any OpenAI-compatible endpoint incl. local Ollama); default model `claude-haiku-4-5-20251001` for cost, configurable; the engine builds all facts; citations `[[node:<id>]]` are validated; no self-hosted GPUs until 2,000 users (scaling design).

## Consequences

- Low cost per explanation.
- Answers can be checked against real node ids.

## Alternatives considered

- A fine-tuned model — rejected for now: cost.
