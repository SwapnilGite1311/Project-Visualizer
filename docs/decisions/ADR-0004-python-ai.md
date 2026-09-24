# ADR-0004: Python for AI and ML

## Status

Accepted

## Date

2026-09-24

## Context

ML libraries, LLM SDKs and embeddings are best in Python.

## Decision

A Python 3.12 FastAPI service `pv_ai`. The MVP uses direct LLM calls from the desktop app instead.

## Consequences

- A separate service to deploy.
- Easy ML.

## Alternatives considered

- Do everything in Node — rejected: weaker ML ecosystem.
