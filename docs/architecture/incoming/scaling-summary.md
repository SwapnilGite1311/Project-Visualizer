# Scaling summary for the new architecture (incoming)

Condensed from the founders' "Scaling Summary for Project Visualizer" (received 2026-09-26). The original document stays with the founders.

## What changed

The first design was a web app where the server parsed code, built graphs and rendered. The new design inverts this: the heavy work runs on the user's machine in the native C++ engine. The server only does what must be central — identity, teams, billing, AI API proxying and optional sync. Scaling is now about a coordination and AI-gateway layer, not about parsing compute.

## Desktop

- Each user's machine is its own compute unit: 200 users = 200 independent engines, no server load for parsing or graph work.
- A modern laptop (16 GB RAM, 8 cores) handles repositories up to about 500,000 lines.
- The local SQLite + LevelDB cache keeps ASTs, so repeated work on a project is near instant; files are re-parsed only when the file watcher sees a change.
- Engine ↔ UI: Unix socket (macOS, Linux) or Named Pipe (Windows). The VS Code extension connects to the same engine on `localhost:7700` and reuses the parsed graph.

## Server for 200 users

| Part | Load at 200 users | Instance |
|---|---|---|
| Auth, sessions, team permissions | 50–100 requests/minute at peak | API gateway + auth on one 2 vCPU / 4 GB instance |
| AI gateway (queue, SSE streaming to the desktop) | 10–20 concurrent jobs | AI gateway + sync on one 4 vCPU / 8 GB instance |
| Sync (optional snapshot sharing; upload, then teammates download) | infrequent bursts (S3 + MongoDB) | (with the AI gateway) |
| Python AI service (external LLM APIs; local ML models for forecasting and anomaly detection) | — | 4 vCPU / 16 GB, no GPU |
| Runtime aggregation (desktop agents send metrics every 5 s → TimescaleDB for team dashboards) | ~40 writes/second | 2 vCPU / 4 GB with TimescaleDB on the same machine |

## Cost (200 users)

Infrastructure about **$263/month**: gateway + auth $24 · AI gateway + sync $48 · Python AI $96 · managed PostgreSQL $25 · MongoDB Atlas M2 $9 · managed Redis $15 · TimescaleDB droplet $24 · S3 $10 · Nginx load balancer $12 · Cloudflare CDN free (DigitalOcean prices). AI API usage $200–400/month. **Total $460–660/month**, about 40% less than the web design ($900–1,100).

## Advantages stated

- **Privacy:** code never leaves the machine; only graph metadata and AI context snippets go to the server, and only when the user asks for AI. Enterprises can run the server on-premise; the desktop works offline for everything except AI.
- **Performance:** a C++ tree-sitter parser is 10–50× faster than JS or Python parsers; a 100,000-line Python codebase parses in under 2 seconds on a laptop.
- **Live updates:** on save, the watcher fires, only that file is re-parsed, the graph delta is applied and the UI updates in under 100 ms.
- **Offline:** parsing, graph viewing, impact analysis, health scoring and execution visualization need no internet; only AI Q&A, team sync and billing need the server.
- **One engine for the desktop and VS Code:** the extension uses the already-running engine; nothing is parsed twice.
