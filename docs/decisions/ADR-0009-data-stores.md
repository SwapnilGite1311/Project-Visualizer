# ADR-0009: Right store for each data type

## Status

Accepted [ARCH-DEPENDENT]

## Date

2026-09-24

## Context

Different data has different shapes and access patterns (current server design).

## Decision

| Data | Store |
|---|---|
| Users, orgs, projects, permissions, metadata (relational, ACID) | PostgreSQL |
| Graph snapshot JSON blobs | MongoDB |
| Raw code snapshots and reports | S3 / MinIO |
| AI embeddings (the design allows Pinecone/Weaviate; Qdrant chosen for simple local dev; interface abstracted) | Qdrant |
| Sessions, BullMQ queues, cache | Redis |
| Desktop local data | in-memory graph + SQLite for metrics history (Phase 5) |

## Consequences

- Each store does what it is best at.
- More services to run in development (Docker compose).

## Alternatives considered

- One PostgreSQL database for everything — rejected: poor fit for large JSON blobs and vectors.
