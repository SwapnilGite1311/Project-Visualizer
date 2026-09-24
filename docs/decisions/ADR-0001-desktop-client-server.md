# ADR-0001: Local-first desktop client with optional cloud services

## Status

Accepted

## Date

2026-09-24

## Context

Users want privacy and speed. Analysing code locally avoids uploading it. Enterprises prefer on-prem deployments.

## Decision

A desktop app (Electron UI + C++ engine) does all parsing and visualization locally. Cloud services (auth, teams, sync, AI gateway, collector, billing) are optional and follow the server architecture [ARCH-DEPENDENT].

## Consequences

- Installers are needed for each OS.
- Offline use is possible.
- Server load is much lower.

## Alternatives considered

- Pure web app — rejected: code upload, privacy, server cost.
