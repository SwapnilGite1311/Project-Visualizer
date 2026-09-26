# New client-server architecture (incoming)

Transcription of Abhishek Awari's architecture diagram ("Local User Request", 2026-09-25), received 2026-09-26. The original PDF stays with the founders; this file keeps its content reviewable in the repository. The comparison with the current plan is in [`diff.md`](diff.md); the scaling notes are in [`scaling-summary.md`](scaling-summary.md).

## 1. Desktop client (user's machine)

**UI layer** (Electron + React + TypeScript)
- 2D Graph View (React Flow + D3)
- 3D Graph View (Three.js + R3F)
- AI Chat Panel
- Simulation Panel
- Runtime Visualizer
- Health Dashboard
- VS Code extension (connects to the local engine)

**IPC**
- IPC Server (Electron main process) and IPC Message Router
- IPC Bridge: JSON over a Unix socket (macOS, Linux) or a Named Pipe (Windows) between the UI and the core engine ("IPC JSON")
- The VS Code extension talks to the engine over local TCP `127.0.0.1:7700`

**Core engine (C++)**
- *Parsing subsystem:* tree-sitter parser core; grammars for Python, JS/TS, Java, Go, C/C++, Rust; plugin grammar loader; AST builder
- *Analysis subsystem:* semantic analyzer, dependency graph builder, impact analysis engine, health score calculator, cyclomatic complexity engine
- *Graph subsystem:* layered graph model, 2D layout engine (Dagre), 3D force-directed layout, component interaction engine, health propagation, abstraction level navigator
- *Runtime subsystem:* runtime ingestion agent, module tracer, error detector, execution visualization engine

**Local cache**
- SQLite: project metadata, AST index
- LevelDB: graph blobs, layout cache
- File system watcher (inotify): "change detected" → re-parse

## 2. Server (Node.js / TypeScript)

Reached over HTTPS through **API Gateway (port 443)**.

**API gateway**
- Load balancer (Nginx)
- API gateway (rate limit / auth / route)
- WebSocket server (team sync / notifications) — desktop connects with WSS

**Auth & teams service**
- Auth service (JWT / OAuth2)
- Teams & permissions service
- Billing service (Stripe)
- Session store (Redis)

**AI gateway service** — desktop sends "AI requests only" over HTTPS; responses stream back as SSE over HTTPS
- AI request router
- AI job queue (BullMQ + Redis)
- AI response cache (Redis)
- Stream relay (SSE)

**Sync & collaboration service** — desktop "Auth / Sync" over HTTPS
- Graph snapshot service
- Graph diff & merge service
- Share & export service
- Notification service

**Runtime aggregation service** — desktop "Runtime upload" over HTTPS
- Runtime data aggregator
- Runtime time-series store
- Alert engine

**Server storage**
- PostgreSQL: users, teams, projects, billing, audit
- MongoDB: shared graph snapshots
- Object storage (S3): exports, reports, shared snapshots
- Redis: sessions, queues, AI cache
- TimescaleDB: runtime metrics (time series)

## 3. AI/ML service (Python, FastAPI)

Called by the server over internal HTTP; streams responses back.

**AI core:** LLM gateway (OpenAI / Anthropic fallback) · Embedding service · Vector search (Pinecone)

**ML models:** Prediction engine · Health forecasting model · Anomaly detection model

**AI features:** Q&A engine (RAG pipeline) · Impact analysis AI explainer · What-if simulation engine · Error explainer · Decision recommendation · Simulation visualization data

## 4. Connections (as drawn)

| From | To | Transport | Purpose |
|---|---|---|---|
| UI | Core engine | IPC JSON (Unix socket / Named Pipe) | all local features |
| VS Code extension | Core engine | local TCP 127.0.0.1:7700 | shares the parsed graph |
| File watcher | Engine | — | "change detected" |
| Desktop | AI gateway | HTTPS | AI requests only |
| AI gateway | Desktop | SSE over HTTPS | streamed AI responses |
| Desktop | Auth / Sync | HTTPS | sign-in, snapshots |
| Desktop | Runtime aggregation | HTTPS | runtime upload |
| WebSocket server | Desktop | WSS | team notifications |
| Server services | Python AI service | internal HTTP (FastAPI) | AI and ML |
