# Test automation

| Lane | Framework | Test location | Run |
| --- | --- | --- | --- |
| Engine | GoogleTest + CTest | `engine/modules/<m>/tests/*_test.cpp` | `cd engine && cmake --build --preset dev && ctest --preset dev -R <Suite>` |
| Desktop | Vitest (+ Testing Library, jsdom) | next to source: `*.test.ts(x)` | `cd desktop && pnpm vitest run <path>` |
| Server | Vitest + `fastify.inject` | `server/services/<svc>/src/**/*.test.ts`, `server/libs/<lib>/src/**/*.test.ts` | `cd server/services/<svc> && pnpm test` (libraries: `cd server/libs/<lib> && pnpm test`) |
| AI (Python) | pytest | `ai/tests/<feature>/test_*.py` | `cd ai && uv run pytest tests/<feature> -q` |
| Agents (Python) | pytest | `agents/python/tests/test_*.py` | `cd agents/python && uv run pytest -q` |
| Agents (Node) | Vitest | `agents/node/src/**/*.test.ts` | `cd agents/node && pnpm test` |
| VS Code ext | Vitest (pure logic) | `vscode-extension/src/**/*.test.ts` | `cd vscode-extension && pnpm test` |
| Contracts | ajv (schema + examples) | `contracts/rpc/<ns>/examples/*.json` | `cd contracts && pnpm validate` |
| Docs tasks | human check | — | open the file; confirm every heading listed in the task exists |

## Not automated

- Visual design review.
- LLM answer quality beyond the eval set.
- Installer UX on real machines.
