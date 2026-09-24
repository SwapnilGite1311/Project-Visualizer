# Subsystems

| Subsystem | Responsibility | Owns data | Talks to |
| --- | --- | --- | --- |
| Engine | parse, graph, analysis, runtime mapping, simulation | in-memory graph, metrics DB | desktop main (RPC) |
| Desktop main | processes, files, network, secrets, runtime hub, AI calls | settings, secrets | engine, renderer, LLM, server, agents, VS Code |
| Renderer | UI only | UI state | main (IPC) |
| Agents | capture runtime events | none | runtime hub |
| VS Code extension | editor integration | none | desktop bridge |
| Cloud services | accounts, teams, sync, AI gateway, billing | Postgres, Mongo, S3, Redis | desktop, Python AI |
| Python AI | LLM orchestration, embeddings, ML | Qdrant | ai-gateway, LLM providers |
