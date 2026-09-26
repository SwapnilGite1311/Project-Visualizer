# Subsystems

Subsystems of the new client-server architecture (2026-09-26) and the plan modules that build them. Everything heavy runs on the desktop; the server groups handle identity, teams, the AI proxy (with SSE streaming), sync and runtime aggregation.

## Desktop client

| Subsystem | Responsibility | Owns data | Talks to | Modules |
| --- | --- | --- | --- | --- |
| UI layer | 2D / 3D views, AI chat, simulation, runtime visualizer, health dashboard | UI state | Electron main (IPC) | P1-DSHELL, P1-DVIEW, P4-DRF2D, P4-DR3F, P1-D2D, P1-D3D, P3-DRT, P3-DHEALTH, P4-DQA, P5-DSIM |
| IPC server and message router | Electron main: routes UI calls to the engine, files, secrets, cloud | settings, secrets | engine, renderer, server, LLM | P1-DMAIN, P1-DPRE, P1-DENG |
| IPC bridge | JSON-RPC over a named pipe / Unix socket (desktop) and TCP 7700 (VS Code) | — | desktop, VS Code, engine | P4-EIPC, P1-RPC-009, P1-DENG-008 |
| Parsing subsystem | tree-sitter core, grammars, plugin loader, extraction | — | analysis | P1-PARSE, P1-PY, P2-LJS, P2-LJAVA, P2-LGO, P3-LCPP, P3-LRUST, P3-LCS, P4-PLUGIN, P4-LPACK |
| Analysis subsystem | dependency graph, impact, health score, complexity | in-memory graph | graph subsystem | P1-BUILDR, P1-ANLYS, P1-IMPACT, P3-HEALTH, P4-CHANGE |
| Graph subsystem | layered model, level navigation, 2D/3D layouts, health propagation | graph, layouts | UI via RPC | P1-GRAPH, P1-GAPI, P4-ELAYOUT |
| Runtime subsystem | ingestion, module tracing, error mapping, execution visualization | event ring buffer | agents via the hub | P3-RTCORE, P3-MODTR, P3-ERRMAP, P3-RTSYNC, P3-DHUB |
| Local cache | project metadata, extraction index, graph blobs, layout cache | SQLite + LevelDB files | engine | P4-ECACHE, P1-BUILDR-012 |
| File watcher | change detected → re-parse one file | — | engine | P4-EWATCH, P4-INCR |
| VS Code extension | show code on the map, open code from the map | none | engine (7700); bridge 47101 as fallback | P2-VSC, P2-DBRIDGE |
| Runtime agents | capture runtime events | none | runtime hub | P3-AGPY, P3-AGNODE |

## Server

| Group | Services | Stores | Modules |
| --- | --- | --- | --- |
| A. API gateway + auth & teams | Nginx, gateway, realtime (WSS), auth, projects (teams & permissions), billing, licensing, SSO, audit, feedback | PostgreSQL, Redis | P2-SGW, P3-SRT, P2-SAUTH, P2-SPROJ, P6-SBILL, P6-SLIC, P6-SSSO, P6-SAUDIT, P6-SFEED |
| B. AI gateway + sync | ai-gateway (queue, quotas, cache, SSE relay), ml-gateway, sync (snapshots, diff & merge, share & export, notifications) | Redis, PostgreSQL, MongoDB, S3 | P4-SAIGW, P5-SMLGW, P2-SSYNC |
| C. Python AI/ML | LLM gateway, embeddings, vector search, ML models, AI features | Qdrant (Pinecone adapter), model files | P4-AI*, P5-ML* |
| D. Runtime aggregation | aggregator, time series, alert engine | TimescaleDB, PostgreSQL | P3-SRTAGG |
