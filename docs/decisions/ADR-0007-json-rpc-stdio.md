# ADR-0007: JSON-RPC over stdio between desktop and engine

## Status

Accepted

## Date

2026-09-24

## Context

The UI and the engine are separate processes.

## Decision

JSON-RPC 2.0 with LSP-style Content-Length framing on stdin/stdout; logs on stderr; schemas in `contracts/rpc`.

## Consequences

- Simple, debuggable, language-neutral.
- JSON cost is acceptable for level-view sized payloads.

## Alternatives considered

- gRPC — rejected: build complexity.
- Shared memory — rejected: complexity.
