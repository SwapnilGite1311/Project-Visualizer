# Interfaces

Every interface of the new client-server architecture (2026-09-26).

| Interface | Transport | Port / path | Auth | Contract | Module |
| --- | --- | --- | --- | --- | --- |
| Engine RPC (desktop) | JSON-RPC 2.0, LSP framing, over a named pipe / Unix socket | `\\.\pipe\pv-engine-<user>-<pid>` / `<tmp>/pv-engine-<user>-<pid>.sock` | OS user only | `contracts/rpc/` | P4-EIPC, P1-DENG |
| Engine RPC (fallback, CLI, tests) | same, over stdio | — | child process | `contracts/rpc/` | P1-RPC |
| Engine RPC (VS Code, local tools) | same, over TCP | `127.0.0.1:7700` (7701–7709) | `engine.hello` token from `~/.project-visualizer/engine.json` | `contracts/rpc/engine-server/`, `editor/` | P4-EIPC, P2-VSC |
| Desktop IPC | Electron IPC `pv:*` | — | preload bridge | R10 | P1-DPRE |
| Runtime hub | HTTP JSON | `127.0.0.1:47100` `/v1/events` | Bearer token | `contracts/events/` | P3-DHUB |
| OTLP | OTLP/HTTP JSON | `127.0.0.1:47100` `/v1/traces` | Bearer token | OpenTelemetry spec | P3-DHUB |
| VS Code bridge (fallback) | WebSocket | `127.0.0.1:47101` | token | P2-DBRIDGE | P2-DBRIDGE |
| Cloud API | HTTPS REST through Nginx + gateway | `:443` `/api/*` | JWT (RS256, 15 min) + refresh | per-service schemas | P2-SGW |
| Cloud AI streaming | Server-Sent Events over HTTPS | `/api/ai/stream/*` | JWT | `contracts/http/ai/stream_event.schema.json` | P4-SAIGW |
| Team notifications | WebSocket (WSS) | `/api/realtime/ws` | JWT in the first message | P3-SRT | P3-SRT |
| Team runtime upload | HTTPS JSON every 5 s | `POST /api/runtime/metrics` | JWT, member | R12 | P3-SRTAGG, P3-DRTUP |
| Server → Python AI | HTTP (internal network) | `:8200` `/v1/*` | internal token | `contracts/http/ai/` | P4-AIBASE |
| LLM | Anthropic Messages API / OpenAI chat completions (fallback between them) | provider | API key | provider docs | P1-DAI, P4-AIBASE |
| MCP | Model Context Protocol over stdio | `pv-engine mcp <root>` | local process | P4-MCP | P4-MCP |
| GitHub OAuth | OAuth 2.0 with a loopback redirect | — | — | P2-SAUTH | P2-SAUTH, P2-DCLOUD |
| Payments | Stripe API + webhooks | — | Stripe keys | P6-SBILL | P6-SBILL |
