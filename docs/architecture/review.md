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
