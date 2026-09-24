# ADR-0003: Electron + React + TypeScript desktop UI

## Status

Accepted

## Date

2026-09-24

## Context

We need a cross-platform desktop app, rich 2D/3D graphics and fast iteration.

## Decision

Electron + React + TypeScript; Cytoscape for 2D; three.js (3d-force-graph) for 3D; Zustand for state; electron-vite for builds.

## Consequences

- Large installer (~100 MB).
- Huge ecosystem.
- Same UI skills as the web.

## Alternatives considered

- Qt/C++ — rejected: slow UI development, weaker 3D/graph libraries.
- Tauri — rejected for now: less mature ecosystem for this team.
