# ADR-0005: Node.js/TypeScript cloud services

## Status

Accepted [ARCH-DEPENDENT]

## Date

2026-09-24

## Context

The current design uses Bull queues (Node) and a JS client.

## Decision

Node.js + TypeScript + Fastify services, each an independent pnpm project (card R13); BullMQ for queues.

## Consequences

- One language for desktop and server.
- Shared types are possible.

## Alternatives considered

- Go — rejected: a second language to learn.
- Python — kept only for AI/ML.
