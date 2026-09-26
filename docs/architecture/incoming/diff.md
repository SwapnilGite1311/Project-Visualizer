# New architecture vs. the current plan (Part H)

Compares the incoming design ([`new-architecture.md`](new-architecture.md), [`scaling-summary.md`](scaling-summary.md)) with the plan's cards R13 (server), R12 (runtime), R11 (AI), R10/R9 (desktop and engine) and the P0-ARCH documents. Written 2026-09-26.

**Status:** applied to the plan on 2026-09-26 (`PLAN: apply new architecture`, linter ERRORS: 0). Sections 1–4 are the comparison (H1). Section 5 lists the **final** module actions and section 6 the founder decisions (H2). Where the first draft of this file proposed merging services, the final choice keeps them as separate processes grouped on the four instances of the scaling summary, because the diagram draws each group as several services.

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
| projects (orgs, members) | 8102 | Teams & permissions service | **kept** as its own service in group A ("Auth & teams") | |
| billing | 8107 | Billing (Stripe) inside "Auth & teams" | **kept**, group A | |
| licensing | 8108 | not drawn (plans live with billing) | **kept**, group A | desktop offline license tokens still needed |
| sso (OIDC) | 8111 | "OAuth2" in auth | **kept**, group A | enterprise add-on |
| audit | 8110 | "audit" is a PostgreSQL data set | **kept**, group A (writes to PostgreSQL) | |
| sync (snapshots) | 8103 | Sync & collaboration: graph snapshot, graph **diff & merge**, **share & export**, notifications | **split/extended** | exports and reports go to S3 |
| ai-gateway | 8104 | AI gateway: router, BullMQ + Redis queue, Redis response cache, **SSE stream relay** | **kept**, adds SSE streaming to desktop | |
| ml-gateway | 8109 | not drawn; ML models sit in the Python service behind the server | **kept**, group B | |
| collector (remote runtime) | 8105 | Runtime aggregation: aggregator, time-series store, **alert engine**; desktop uploads every 5 s | **replaced** (direction reversed: desktop → cloud) | ~40 writes/s at 200 users |
| ingest (cloud Git import) | 8112 | — | **removed** | Git import runs on the desktop (P3-DCIMP) |
| parse-worker (headless engine) | — | — | **removed** | no server-side parsing |
| feedback | 8113 | not drawn | **kept**, group A | business need from P6-GROW |
| Python AI service | 8200 | FastAPI AI/ML service: LLM gateway (OpenAI/Anthropic fallback), embeddings, vector search, ML models, AI features | **kept + extended** (anomaly detection, impact explainer, what-if data) | |

Internal ports are not in the diagram; the plan keeps the R13 numbers for kept services (8080, 8101, 8103, 8104, 8200) and gives the new runtime aggregation service the collector's slot 8105.

## 4. Stores, protocols, auth

| Topic | Current plan | New design | Change |
|---|---|---|---|
| PostgreSQL | users, orgs, projects, permissions, metadata | users, teams, projects, billing, **audit** | **kept** |
| MongoDB | graph snapshot JSON | shared graph snapshots | **kept** |
| Object storage | MinIO (S3 API) for reports, raw snapshots | S3: exports, reports, shared snapshots | **kept** (MinIO stays for local dev; same S3 API) |
| Redis | sessions, BullMQ, cache | sessions, queues, AI cache | **kept** |
| Vector DB | Qdrant (interface abstracted) | **Pinecone** | changed. Decision **D7** |
| Time series | none on the server (Prometheus for ops only) | **TimescaleDB** for runtime metrics | **new** |
| Observability | Prometheus, Grafana, Jaeger, ELK (P2-OBS) | not drawn | **kept** as ops tooling (unchanged; ELK can be left out of small deployments) |
| Queues | `pv-parse`, `pv-ai`, `pv-runtime`, `pv-ml` | AI job queue only | `pv-parse` **removed**; `pv-ml` merged into `pv-ai`; `pv-runtime` optional |
| Desktop ↔ server | HTTPS REST through the gateway; WebSocket for realtime | HTTPS (AI, auth/sync, runtime upload), **SSE** for AI streaming, **WSS** for notifications | **kept** + SSE |
| Server ↔ Python | HTTP from ai-gateway / ml-gateway | internal HTTP (FastAPI), streaming | **kept** |
| Auth flow | RS256 JWT (15 min) + rotating refresh in Redis; GitHub OAuth for desktop; OIDC SSO service | JWT / OAuth2 + Redis session store | **kept** |
| Deployment (≤ 200 users) | Compose locally; Kubernetes/Helm ≥ 500 users | 4 instances (2/4, 4/8, 4/16, 2/4 vCPU/GB) + managed PG, Redis, Atlas, S3; ~$263/month | **new sizing**; Helm stays for enterprise on-prem |

## 5. Module actions (final)

| Module | Built? | Action | What changes |
|---|---|---|---|
| P0-ARCH | yes | **New tasks** 008–010 | rewrite overview, subsystems, dataflow, interfaces, deployment, review for the new design |
| P0-REPO, P0-ENV, P0-TOOLS, P0-CI, P1-REL | yes | **Keep** | — |
| P1-RPC | yes | **New task** 009 | `Connection` over any byte stream + `FanoutNotifier` (several clients) |
| P1-EAPP | yes | **New task** 004 | main uses the fan-out notifier |
| P1-BUILDR | yes | **New task** 012 | extraction cache hook for the local cache |
| P1-DENG | yes | **New task** 008 | desktop talks to the engine over a named pipe / Unix socket; stdio fallback |
| P1-DVIEW | yes | **New task** 008 | renderer choice per mode, engine layouts in `ViewGraph`, "Graph view" settings |
| P2-DBRIDGE | yes | **New task** 007 | VS Code link through the engine (`editor.*`); 47101 bridge is the fallback |
| P2-VSC | yes | **New task** 006 | extension connects to the engine on TCP 7700 (token in `engine.json`) |
| P2-INFRA | no | **Amend** | TimescaleDB container (port 5433) |
| P2-SBASE, P2-SDB, P2-OBS, P2-SAUTH, P2-SPROJ, P2-SGW | no | **Keep** | deployed as group A (R13) |
| P2-SSYNC | no | **Amend** (new task 006) | diff & merge, export to S3, `pv:notify` messages |
| P2-DCLOUD | no | **Amend** | `CloudClient.stream()` for SSE |
| P3-SCOLL | no | **Replace** → P3-SRTAGG | runtime aggregation, TimescaleDB, alert engine |
| P3-SRT | no | **Amend** | WebSocket for team sync + notifications (`pv:notify:<project>`) |
| P3-SING, P3-SPW | no | **Replace** → P3-DCIMP | no server-side parsing |
| P3-DCIMP | no | **Amend** | Git import kept: clone + analyze on the desktop, then share the map |
| P3-DREMOTE | no | **Replace** → P3-DRTUP | opt-in team runtime upload every 5 s, dashboard, alerts |
| P3-UDOC, P3-SIGN | no | **Amend** | new team pages; dependencies |
| — | — | **New** P4-EWATCH | native watcher (ReadDirectoryChangesW / inotify / FSEvents) |
| P4-INCR | yes | **New task** 005 | native watcher as change source, < 100 ms target |
| — | — | **New** P4-EIPC | `pv-engine serve`: named pipe + TCP 7700, `engine.json`, editor relay |
| — | — | **New** P4-ECACHE | SQLite + LevelDB local cache (takes SQLite from P5-METRIC) |
| — | — | **New** P4-ELAYOUT | Dagre-style layered 2D and 3D force layouts in the engine, `layout.compute` |
| P4-CRPC | yes | **New tasks** 005–006 | schemas for the above + AI stream events |
| — | — | **New** P4-DDEPS | React Flow, D3 modules, React Three Fiber |
| — | — | **New** P4-DRF2D, P4-DR3F | new preferred 2D / 3D renderers; Cytoscape and 3d-force-graph stay as "Classic" |
| P4-AIDEPS, P4-AIBASE, P4-AIEXP, P4-AIQA, P4-AIEMB | no | **Amend** | Pinecone adapter, provider fallback, streaming endpoints |
| P4-AIERR, P4-AIEVAL | no | **Keep** | — |
| P4-SAIGW | no | **Amend** (new task 006) | SSE stream relay |
| P4-DAIM, P4-DQA | no | **Amend** (new tasks) | streamed answers in cloud mode |
| P4-UDOC, P4-SIGN | no | **Amend** | new user page; dependencies |
| P5-METRIC | no | **Amend** | task 001 removed (SQLite now in P4-ECACHE) |
| — | — | **New** P5-MLANOM | anomaly detection model |
| P5-SMLGW, P5-DML, P5-DFC | no | **Amend** (new tasks) | anomaly route, channel and chart markers |
| P5-SIM, other P5-ML* | no | **Keep** | simulation stays local (offline promise) |
| P6-SLIC, P6-SBILL, P6-SSSO, P6-SAUDIT, P6-SFEED, P6-SEC | no | **Keep** | deployed as group A |
| P6-ONPREM | no | **Amend** | chart lists the new services and groups |

The "impact analysis AI explainer" of the diagram is covered by the existing change summary feature (P4-AIQA-002, P4-DCHANGE).

## 6. Founder decisions (2026-09-26)

| # | Question | Decision |
|---|---|---|
| D1 | Keep direct AI mode next to the cloud AI gateway? | **Keep both.** |
| D2–D6 | Named pipe, VS Code on TCP 7700, local SQLite + LevelDB cache, native watcher, React Flow / R3F with engine layouts? | **Bend the existing code to match the new design** step by step; every old path stays as a fallback (stdio, bridge 47101, Classic renderers, polling). |
| D7 | Pinecone or Qdrant? | **Qdrant by default + a Pinecone adapter** (hosted cloud only). |
| D8 | What-if simulation in the Python service? | **Stays local** in the engine (P5-SIM); not in the diagram's Python service. |
| D9 | Shrink the server? Keep Git import? | **Git import is kept** and runs on the desktop (clone + analyze locally, share the map). Services stay separate processes grouped on four instances; collector, ingest and parse-worker are removed. |

## 7. Frozen until the plan change landed

All not-started tasks of the affected server, AI and cloud-facing desktop modules were frozen from the H1 commit until `PLAN: apply new architecture`. They are unfrozen now and follow the new text.
