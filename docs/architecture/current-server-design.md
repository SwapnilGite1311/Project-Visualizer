# Current server design (v1)

A faithful copy of the server design by Abhishek Awari (Sheet 1, backend design, scaling for 200 users), kept so later changes are traceable. [ARCH-DEPENDENT]

## Layers

1. **Client:** web browser (React/Next.js) and VS Code extension.
2. **Nginx load balancer.**
3. **API gateway** (rate limiting, auth, routing) + **WebSocket server**.
4. **Services:**
   - **Auth:** JWT/OAuth2 + Redis session store.
   - **Ingestion:** folder / Git / snippet / context handlers → Redis ingestion queue.
   - **Parsing & Analysis:** language parsers → AST generation → semantic analysis → layered graph builder.
   - **Graph & Rendering:** render-agnostic core, abstraction navigation, shared rendering core, 2D Canvas/SVG, 3D Three.js, health hooks, component interaction.
   - **AI:** Q&A, impact, what-if, simulation visualization, decision recommendation, prediction engine, health forecasting, AI queue.
   - **Runtime & Monitoring:** runtime ingestion agent, module tracing, execution visualization, health & error detection, error explanation.

## Storage

- Redis cache (graph / AST / sessions).
- CDN (static assets).
- PostgreSQL (users / projects / metadata).
- MongoDB (AST / graph JSON blobs).
- S3 (code snapshots / reports).
- Vector DB (Pinecone / Weaviate).

## Messaging

Redis Pub/Sub + Bull queue for job orchestration.

## Observability

ELK, Prometheus + Grafana, Jaeger.

## Scaling decisions

- Async everything heavy.
- Cache aggressively.
- Render on the client.
- Managed external AI.
- The right database per data type.
- At least 2 instances per critical service.
- Rate limit at the gateway.

## What changes in the desktop direction

- Parsing and graph building move into the desktop C++ engine.
- The server keeps auth, teams, sync, AI gateway, runtime aggregation and billing.
- A parse-worker reuses the engine for cloud/team imports.
