# New architecture vs. the current plan (Part H, step H1)

Compares the incoming design ([`new-architecture.md`](new-architecture.md), [`scaling-summary.md`](scaling-summary.md)) with the plan's cards R13 (server), R12 (runtime), R11 (AI), R10/R9 (desktop and engine) and the P0-ARCH documents. Written 2026-09-26.

**Status:** comparison done; the module actions in section 5 are **proposals**. They become the plan only after the founders answer the decisions in section 6 and the `PLAN: apply new architecture` commit passes the linter (H2).

## 1. Headline

The new design is **desktop-first**: parsing, graphs, impact, health and runtime visualization run on the user's machine; the server keeps identity, teams, billing, the AI proxy, optional sync and team runtime dashboards. The current plan already has the same split for local work (C++ engine, local runtime hub, direct AI mode), and Phases 1–4 (local) are built this way. So:

- **The desktop and engine code already built needs no change** to fit the new design. The differences on the desktop side are technology choices drawn in the diagram (named pipe, TCP 7700, React Flow, SQLite/LevelDB cache), listed as decisions D2–D6.
- **The server shrinks** from 15 Node services + parse worker to 5 service groups. The cloud parsing path (Git import → parse worker) disappears.
- **Runtime in the cloud changes direction:** the old collector brought events *from deployed apps down to one desktop*; the new runtime aggregation takes metrics *up from desktops* for team dashboards and alerts (TimescaleDB).
- No server module has been started yet (only Phase 0 docs, CI and the P1 release scaffold are merged), so replacing server modules deletes no code.

## 2. Desktop side

| Topic | Current plan (built) | New design | Kind of change |
|---|---|---|---|
| UI ↔ engine transport | Engine is a child process; JSON-RPC 2.0 over **stdio** with LSP framing (R9) | JSON over **Unix socket / Named Pipe** | changed transport, same idea (local JSON messages). Decision **D2** |
| Electron main process | Handlers + `EngineService` forward calls (R10) | "IPC server + message router" in main | **kept** (same thing, other names) |
| VS Code extension | Talks to the desktop's bridge, WebSocket `127.0.0.1:47101` (P2-DBRIDGE, P2-VSC) | Talks to the **engine directly**, TCP `127.0.0.1:7700` | changed. Decision **D3** |
| 2D view | Cytoscape.js (P1-D2D) | React Flow + D3 | changed library. Decision **D6** |
| 3D view | 3d-force-graph / Three.js (P1-D3D) | Three.js + React Three Fiber | same engine (Three.js), other wrapper. Decision **D6** |
| Layout | Computed in the renderer (Cytoscape layouts, force 3D) | Engine graph subsystem: Dagre 2D, 3D force | moved into engine. Decision **D6** |
| Parsing | tree-sitter; Python, JS/TS, Java, Go, C/C++, Rust, C#; plugin loader (Ruby, PHP, Kotlin packs) | tree-sitter; Python, JS/TS, Java, Go, C/C++, Rust; plugin grammar loader | **kept** (plan has more languages) |
| Analysis | Graph builder, impact, health score, complexity (P1-ANLYS, P1-IMPACT, P3-HEALTH) | Semantic analyzer, dependency graph, impact, health, cyclomatic complexity | **kept** |
| Graph model | Layered graph, abstraction levels, health propagation | Same list | **kept** |
| Runtime (local) | Agents → local hub `127.0.0.1:47100` (R12) → `runtime.ingest` → module tracer, error mapping, live overlay | Runtime ingestion agent, module tracer, error detector, execution visualization | **kept** |
| Local cache | In-memory graph; snapshots (P2-SNAP); SQLite for metrics history (P5-METRIC, not built) | **SQLite** (project metadata, AST index) + **LevelDB** (graph blobs, layout cache) | new: persistent parse cache. Decision **D4** |
| File watcher | Polling scan every 1 s (P4-INCR, built) | Native watcher (inotify); save → UI in **< 100 ms** | changed. Decision **D5** |
| AI on desktop | Direct mode with the user's own key (P1-DAI) + optional cloud mode (P4-DAIM) | "AI requests only" to the server | Decision **D1** |
| MCP server for AI agents | `pv-engine mcp` (P4-MCP, built) | not drawn | **kept** (local, no conflict) |
| Simulation | What-if engine in C++ (P5-SIM, local) | "What-if simulation engine" + "simulation visualization data" in the **Python AI service** | Decision **D8** |

## 3. Server side, service by service

| Current service (R13) | Port | New design | Change | Notes |
|---|---|---|---|---|
| Nginx (TLS, LB) | 80/443 | Load balancer (Nginx), public port 443 | **kept** | |
| gateway | 8080 | API gateway (rate limit, auth, route) | **kept** | |
| realtime (WebSocket fan-out) | 8106 | WebSocket server inside the API gateway group: team sync + notifications (WSS) | **merged** into gateway group; purpose changes from live runtime fan-out to team notifications | |
| auth | 8101 | Auth service (JWT / OAuth2) + session store (Redis) | **kept** | same JWT + Redis refresh design |
| projects (orgs, members) | 8102 | Teams & permissions service | **renamed / merged** into "Auth & teams" | |
| billing | 8107 | Billing (Stripe) inside "Auth & teams" | **merged** | |
| licensing | 8108 | not drawn (plans live with billing) | **merged** into billing? Decision **D9** | desktop offline license tokens still needed |
| sso (OIDC) | 8111 | "OAuth2" in auth | **merged** into auth (proposal) | enterprise SSO becomes an auth feature |
| audit | 8110 | "audit" is a PostgreSQL data set | **merged**: an audit table written by the services, no own service | |
| sync (snapshots) | 8103 | Sync & collaboration: graph snapshot, graph **diff & merge**, **share & export**, notifications | **split/extended** | exports and reports go to S3 |
| ai-gateway | 8104 | AI gateway: router, BullMQ + Redis queue, Redis response cache, **SSE stream relay** | **kept**, adds SSE streaming to desktop | |
| ml-gateway | 8109 | not drawn; ML models sit in the Python service behind the server | **merged** into AI gateway (proposal) | Decision **D9** |
| collector (remote runtime) | 8105 | Runtime aggregation: aggregator, time-series store, **alert engine**; desktop uploads every 5 s | **replaced** (direction reversed: desktop → cloud) | ~40 writes/s at 200 users |
| ingest (cloud Git import) | 8112 | — | **removed** | code never leaves the machine |
| parse-worker (headless engine) | — | — | **removed** | no server-side parsing |
| feedback | 8113 | not drawn | **kept as optional** or folded into gateway group (proposal: small route in the gateway group) | business need from P6-GROW |
| Python AI service | 8200 | FastAPI AI/ML service: LLM gateway (OpenAI/Anthropic fallback), embeddings, vector search, ML models, AI features | **kept + extended** (anomaly detection, impact explainer, what-if data) | |

Internal ports are not in the diagram; the proposal keeps the R13 numbers for kept services (8080, 8101, 8103, 8104, 8200) and gives the new runtime aggregation service the collector's slot 8105.

## 4. Stores, protocols, auth

| Topic | Current plan | New design | Change |
|---|---|---|---|
| PostgreSQL | users, orgs, projects, permissions, metadata | users, teams, projects, billing, **audit** | **kept** |
| MongoDB | graph snapshot JSON | shared graph snapshots | **kept** |
| Object storage | MinIO (S3 API) for reports, raw snapshots | S3: exports, reports, shared snapshots | **kept** (MinIO stays for local dev; same S3 API) |
| Redis | sessions, BullMQ, cache | sessions, queues, AI cache | **kept** |
| Vector DB | Qdrant (interface abstracted) | **Pinecone** | changed. Decision **D7** |
| Time series | none on the server (Prometheus for ops only) | **TimescaleDB** for runtime metrics | **new** |
| Observability | Prometheus, Grafana, Jaeger, ELK (P2-OBS) | not drawn | **kept as ops tooling** (proposal: trim ELK; keep Prometheus + Grafana + Jaeger) |
| Queues | `pv-parse`, `pv-ai`, `pv-runtime`, `pv-ml` | AI job queue only | `pv-parse` **removed**; `pv-ml` merged into `pv-ai`; `pv-runtime` optional |
| Desktop ↔ server | HTTPS REST through the gateway; WebSocket for realtime | HTTPS (AI, auth/sync, runtime upload), **SSE** for AI streaming, **WSS** for notifications | **kept** + SSE |
| Server ↔ Python | HTTP from ai-gateway / ml-gateway | internal HTTP (FastAPI), streaming | **kept** |
| Auth flow | RS256 JWT (15 min) + rotating refresh in Redis; GitHub OAuth for desktop; OIDC SSO service | JWT / OAuth2 + Redis session store | **kept** |
| Deployment (≤ 200 users) | Compose locally; Kubernetes/Helm ≥ 500 users | 4 instances (2/4, 4/8, 4/16, 2/4 vCPU/GB) + managed PG, Redis, Atlas, S3; ~$263/month | **new sizing**; Helm stays for enterprise on-prem |

## 5. Module actions (proposal)

Modules from H3 plus desktop modules that call the server. "Merged" = code already in `main`.

| Module | Merged? | Proposed action | Reason |
|---|---|---|---|
| P0-REPO, P0-ENV, P0-TOOLS, P0-CI | yes | **Keep** | no server-shape assumptions |
| P0-ARCH | yes | **Amend** by new tasks P0-ARCH-008… that rewrite `overview`, `subsystems`, `dataflow`, `interfaces`, `deployment`, `review` and add `server-design-v2.md` | H2 step 5 |
| P1-REL | yes | **Keep** | |
| P2-SBASE, P2-SDB | no | **Keep** | service template and DB library still fit |
| P2-INFRA | no | **Amend**: add TimescaleDB; vector store per D7 | |
| P2-OBS | no | **Amend**: drop ELK (optional) | smaller ops footprint for 200 users |
| P2-SAUTH | no | **Amend**: add teams & permissions, OIDC (from P6-SSSO), session store | "Auth & teams service" |
| P2-SPROJ | no | **Replace** by the teams part of P2-SAUTH (or keep as a folder inside it) | merged into auth & teams |
| P2-SGW | no | **Amend**: add the WebSocket server for team notifications | WS lives in the gateway group |
| P2-SSYNC | no | **Amend**: add diff & merge, share & export (S3), notifications | Sync & collaboration |
| P2-DCLOUD | no | **Keep** (only endpoint paths may move) | desktop talks only through `cloud-client.ts` |
| P3-SCOLL | no | **Replace** by new `P3-SRTAGG` (runtime aggregation + TimescaleDB + alerts) | direction reversed |
| P3-SRT | no | **Replace** (folded into P2-SGW WebSocket) | |
| P3-SING, P3-SPW | no | **Replace → removed** (mark SUPERSEDED, no successor) | no server parsing |
| P3-DCIMP | no | **Removed** | depends on P3-SING |
| P3-DREMOTE | no | **Replace** by new `P3-DRTUP`: opt-in upload of runtime metrics every 5 s + team dashboard / alerts view | follows P3-SRTAGG |
| P3-UDOC-002 (`remote-and-cloud-import.md`) | no | **Amend** to "team runtime dashboards" | |
| P4-AIDEPS, P4-AIBASE, P4-AIEXP, P4-AIERR, P4-AIQA, P4-AIEVAL | no | **Keep**; P4-AIBASE **Amend**: LLM gateway with OpenAI → Anthropic fallback | |
| P4-AIEMB | no | **Amend** per D7 (vector store adapter) | |
| P4-SAIGW | no | **Amend**: SSE stream relay to the desktop; absorbs ML routes (D9) | |
| P4-DAIM | no | **Amend**: read SSE streams in cloud mode | |
| P5-AIDEPS, P5-MLBASE, P5-MLFAIL, P5-MLBOT, P5-MLFC, P5-MLREC | no | **Keep** | = "prediction engine", "health forecasting", "decision recommendation" |
| — | — | **New** `P5-MLANOM`: anomaly detection model | in the diagram, not in the plan |
| — | — | **New** `P5-AIIMPX`: impact analysis AI explainer (Python feature) | in the diagram |
| P5-SIM / P5-DSIM | no | **Keep local** (proposal) + optional Python what-if data per D8 | offline promise |
| P5-SMLGW | no | **Replace** by routes in P4-SAIGW (D9) | |
| P5-DML | no | **Amend**: call the AI gateway instead of the ML gateway | |
| P6-SEC | no | **Amend**: fewer services to harden | |
| P6-SLIC | no | **Merge** into P6-SBILL (D9) | |
| P6-SBILL | no | **Amend**: billing lives in the auth & teams group; issue desktop license tokens | |
| P6-SAUDIT | no | **Replace** by an audit table + writer library in P2-SDB | |
| P6-SSSO | no | **Replace** by the OIDC part of P2-SAUTH | |
| P6-SFEED | no | **Keep** (small) | |
| P6-ONPREM | no | **Amend**: chart for the 5 service groups | |
| P6-DLIC, P6-DSSO | no | **Keep** (endpoints may move) | |

## 6. Decisions for the founders

| # | Question | Recommendation |
|---|---|---|
| D1 | Keep **direct AI mode** (user's own key, works with no account) next to the cloud AI gateway? The diagram shows only the server path. | Keep both. Direct mode is built and is the only AI option offline / on-prem without a server. |
| D2 | Engine ↔ UI over **named pipe / Unix socket** instead of stdio? | Keep stdio. Same JSON messages, already built and tested; a pipe only matters if other programs must connect to the engine (see D3). |
| D3 | VS Code extension on **engine TCP 7700** instead of the desktop bridge on 47101? | Keep 47101 through the desktop. It already shares the one running engine ("nothing parsed twice"); a direct engine port needs its own auth token. |
| D4 | Add a persistent **SQLite + LevelDB** parse/layout cache? | Add SQLite only (already in P5-METRIC) for a parse cache keyed by file hash; skip LevelDB unless measurements need it. |
| D5 | **Native file watcher** with a < 100 ms target instead of 1 s polling? | Yes, as a new engine task (ReadDirectoryChangesW / inotify / FSEvents) with polling as fallback. |
| D6 | Switch 2D to **React Flow + D3** and 3D to **R3F**, layout into the engine (Dagre)? | Keep Cytoscape and 3d-force-graph (built, tested, fast for large graphs). Treat the diagram's libraries as illustrative. |
| D7 | **Pinecone** instead of Qdrant? | Keep Qdrant as default behind the existing interface, Pinecone as a second adapter. Pinecone is cloud-only and breaks on-prem. |
| D8 | What-if simulation in the **Python service** instead of the local engine? | Keep the simulation local (offline promise); the Python service only adds AI explanations of results. |
| D9 | Fold **ML gateway** into the AI gateway, **licensing** into billing, **audit** and **SSO** into existing services? | Yes to all — matches the 5-group server and the $263/month sizing. |

## 7. What H1 froze

Not-started tasks of these modules are frozen until `PLAN: apply new architecture` lands: P2-INFRA, P2-OBS, P2-SBASE, P2-SDB, P2-SAUTH, P2-SGW, P2-SPROJ, P2-SSYNC, P2-DCLOUD, P3-SCOLL, P3-SRT, P3-SING, P3-SPW, P3-DCIMP, P3-DREMOTE, P3-UDOC-002, all P4-AI*, P4-SAIGW, P4-DAIM, P5-AIDEPS, P5-ML*, P5-SMLGW, P5-DML, P6-SEC, P6-SLIC, P6-SAUDIT, P6-SFEED, P6-SBILL, P6-SSSO, P6-ONPREM. Local modules (engine, desktop features, agents, VS Code, business) continue.
