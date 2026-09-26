# Architecture review

| Requirement | Satisfied by | OK? |
| --- | --- | --- |
| PERF-02 | Engine parses files on background threads (P1-SESS, P1-PARSE) | yes |
| PERF-03 | Engine level views with aggregated edges (P1-GRAPH, P1-GAPI) | yes |
| PERF-04 | Desktop loads one level view at a time; Cytoscape 2D renderer (P1-D2D) | yes |
| SEC-01 | Local-first desktop; sharing only through P2-DCLOUD on user action | yes |
| SEC-02 | Engine-built context packs (P1-CTX) are the only AI input | yes |
| SEC-03 | Desktop main secret store with safeStorage (P1-DMAIN) | yes |
| SEC-05 | Runtime hub and VS Code bridge bind to 127.0.0.1 with tokens (P3-DHUB, P2-DBRIDGE) | yes |
| REL-01 | Desktop engine service restarts the engine (P1-DENG) | yes |
| REL-02 | Per-file parse errors are reported, not fatal (P1-PARSE, P1-BUILDR) | yes |
| MNT-02 | Language adapters as `lang_*` modules and plugins (P1-PARSE, P4-PLUGIN) | yes |
| MNT-03 | Renderer feature auto-discovery (P1-DSHELL) | yes |
| USE-01 | Welcome screen with Open folder (P1-DIMPORT) | yes |

## Key decisions

- [ADR-0001 — Local-first desktop client with optional cloud services](../decisions/ADR-0001-desktop-client-server.md)
- [ADR-0002 — C++20 core engine](../decisions/ADR-0002-cpp-engine.md)
- [ADR-0003 — Electron + React + TypeScript desktop UI](../decisions/ADR-0003-electron-react.md)
- [ADR-0004 — Python for AI and ML](../decisions/ADR-0004-python-ai.md)
- [ADR-0005 — Node.js/TypeScript cloud services](../decisions/ADR-0005-node-server.md)
- [ADR-0006 — tree-sitter for parsing all languages](../decisions/ADR-0006-tree-sitter.md)
- [ADR-0007 — JSON-RPC over stdio between desktop and engine](../decisions/ADR-0007-json-rpc-stdio.md)
- [ADR-0008 — Monorepo with strict file ownership](../decisions/ADR-0008-monorepo-ownership.md)
- [ADR-0009 — Right store for each data type](../decisions/ADR-0009-data-stores.md)
- [ADR-0010 — LLM providers and grounding](../decisions/ADR-0010-llm-grounding.md)

## Review of the new architecture (2026-09-26)

The new client-server design keeps every requirement above satisfied (all local features still work with no server) and adds:

| Requirement | Satisfied by | OK? |
| --- | --- | --- |
| Save → map update < 100 ms | native watcher (P4-EWATCH) + incremental re-parse (P4-INCR-005) | planned |
| 100,000-line Python project parses < 2 s; instant reopen | parallel extraction (P1-BUILDR) + local cache (P4-ECACHE) | planned |
| One engine for the desktop and VS Code | engine local server, named pipe + TCP 7700 (P4-EIPC) | planned |
| Code never leaves the machine | no server parsing (P3-SING, P3-SPW superseded); Git import runs locally (P3-DCIMP); runtime upload sends aggregates only (P3-DRTUP) | yes |
| Offline except AI, sync, billing | direct AI mode kept (D1); all engine features local | yes |

Founder decisions (details in [`incoming/diff.md`](incoming/diff.md) section 6):

- **D1** keep direct AI mode next to the cloud AI gateway.
- **D2–D6** bend the built desktop and engine toward the diagram (named pipe, TCP 7700, SQLite + LevelDB cache, native watcher, React Flow / R3F with engine layouts), keeping every old path as a fallback.
- **D7** Qdrant by default, Pinecone adapter for the hosted cloud.
- **D8** what-if simulation stays in the local engine.
- **D9** keep Git import (on the desktop); server services stay separate processes grouped on four instances; collector, ingest and parse-worker removed.
