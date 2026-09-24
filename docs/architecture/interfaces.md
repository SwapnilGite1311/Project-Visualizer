# Interfaces

| Interface | Protocol | Contract location |
| --- | --- | --- |
| Engine RPC | JSON-RPC over stdio | `contracts/rpc/` |
| Desktop IPC | Electron IPC `pv:*` | R10 |
| Runtime hub | HTTP JSON 127.0.0.1:47100 | `contracts/events/` |
| OTLP | OTLP/HTTP JSON | OpenTelemetry spec |
| VS Code bridge | WebSocket 127.0.0.1:47101 | P2-DBRIDGE |
| Cloud API | HTTPS REST via gateway | OpenAPI per service |
| LLM | Anthropic Messages API / OpenAI chat completions | provider docs |
| MCP | Model Context Protocol over stdio | P4-MCP |
| GitHub OAuth | OAuth 2.0 | P2-SAUTH |
| Payments | Stripe API | P6-SBILL |
