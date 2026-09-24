# MVP checkpoint

## Build

```bash
cd engine && cmake --preset dev && cmake --build --preset dev && ctest --preset dev
cd desktop && pnpm install && pnpm typecheck && pnpm test && pnpm dev
```

For speed measurements build the Release engine too: `cd engine && cmake --build --preset release` (the Debug engine is about 20× slower at opening projects).

## Demo script

1. Start the app.
2. Settings → AI → add a key (or Ollama URL + model) → Test connection.
3. Open folder `engine/modules/lang_python/tests/fixtures/pyproj_small`.
4. See 4 nodes at the top level.
5. Double-click `app` → 5 nodes.
6. Select `services.py` → inspector shows code.
7. Right-click `UserService` (inside `services.py`) → Explain this → explanation with clickable references.
8. Right-click `is_valid` (inside `utils.py`) → What breaks? → 3 affected, risk shown, map highlighted.
9. Breadcrumb back to the project.
10. Repeat steps 3–8 on a real open-source Python project (e.g. clone `https://github.com/pallets/flask`).

## Acceptance

Evidence from an automated run of steps 3–9 on the built app (2026-09-24, Playwright driving Electron; Explain used a local fake OpenAI-compatible server instead of a real LLM). Founders: confirm by hand and add step 10 results.

| Story | Criterion | Result | Notes |
| --- | --- | --- | --- |
| US-01 | ≤ 5,000 .py files shown within 30 s; progress visible while loading | pass | Fixture ready in 0.2–0.3 s; a real 200-file project ready in 0.41 s (Release engine). Progress view shows state and file counts. |
| US-02 | Double-click shows children and aggregated edges within 500 ms | pass | `app` → 5 nodes; `services.py` → 1 node; `utils.py` → 2 nodes. |
| US-03 | First breadcrumb item returns to the project top level | pass | Breadcrumb back to 4 top-level nodes. |
| US-04 | Inspector shows name, kind, path, line range, metrics and exact source | pass | `services.py`: kind, `app.services`, `app/services.py:1–15`, metrics, highlighted code. |
| US-05 | Explanation within 20 s, clickable citations, invalid citations removed | pass (fake LLM) | Clicking a citation selects that node on the map; a made-up citation was removed. **Not yet tried with a real API key.** |
| US-06 | 3 callers highlighted at distance 1, list with distances, risk level shown | pass | `is_valid`: 3 direct dependents, risk 34/100 "medium", map dimmed except affected nodes. |

## Measurements

| ID | Target | Measured |
| --- | --- | --- |
| PERF-01 | Engine start to `engine.ping` < 1 s | 20–67 ms |
| PERF-02 | 1,000 files ready < 10 s | 200-file real project: 0.41 s Release (≈ 2 s per 1,000 files); 9.6 s with the Debug engine |
| PERF-03 | `graph.level_view` ≤ 500 nodes < 200 ms | 107-node level: 14 ms Release, 129 ms Debug |
| PERF-04 | 2D render ≤ 500 nodes < 500 ms | not measured yet (small levels render instantly) |
| PERF-06 | Explain first result < 20 s | not measured with a real LLM yet |

## Decision

- [ ] Continue Phase 1 post-MVP
- [ ] Fix blockers first (list them)

Signed:
