# ADR-0002: C++20 core engine

## Status

Accepted

## Date

2026-09-24

## Context

Large codebases, real-time updates and graph queries must be fast and memory-efficient.

## Decision

`pv-engine`: a C++20 executable with tree-sitter parsing and an in-memory graph, talking JSON-RPC over stdio.

## Consequences

- Fast.
- Harder to write; strict tests and small tasks are needed.
- A separate process isolates crashes.

## Alternatives considered

- Rust — rejected: team knowledge.
- Node.js — rejected: speed and memory.
- Linking C++ into Electron as an N-API addon — rejected: a crash takes down the UI; complex builds.
