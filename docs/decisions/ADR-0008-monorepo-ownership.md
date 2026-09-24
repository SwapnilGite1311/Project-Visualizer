# ADR-0008: Monorepo with strict file ownership

## Status

Accepted

## Date

2026-09-24

## Context

Many AI models may work on the code in parallel.

## Decision

One repository; every path is owned by exactly one module; auto-discovery folders instead of shared registries; only DEPS modules edit shared manifests.

## Consequences

- Zero merge conflicts by design.
- Slightly more files.

## Alternatives considered

- Polyrepo — rejected: coordination overhead.
