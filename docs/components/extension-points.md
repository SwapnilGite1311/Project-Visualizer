# Extension points

| Extension point | How to extend | Example |
| --- | --- | --- |
| Engine module | new folder `engine/modules/<m>` | `search` |
| Engine RPC method | `register.cpp` adds to `reg.methods` | `graph.node` |
| Engine CLI command | `reg.cli.add` | `analyze` |
| Language adapter | `lang_<id>` module | `lang_python` |
| Language plugin (Phase 4) | grammar DLL + queries folder | Ruby |
| Desktop IPC handler | `src/main/handlers/<name>.ts` | `ai.ts` |
| Renderer feature | `features/<name>/register.ts` | `inspector` |
| Renderer | `renderers/<name>/index.ts` | `cy2d` |
| AI provider | `src/main/ai-providers/<name>/index.ts` | `anthropic` |
| Python AI feature | `pv_ai/features/<name>/router.py` | `explain` |
| Server route | `gateway-route.json` | auth |
