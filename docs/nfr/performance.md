# Performance targets

| ID | Target | Measure |
|---|---|---|
| PERF-01 | Engine start to `engine.ping` answer < 1 s | timer in desktop |
| PERF-02 | Open a 1,000-file Python project to `ready` < 10 s; 10,000 files < 60 s | `project.status` timestamps |
| PERF-03 | `graph.level_view` with ≤ 500 nodes < 200 ms | engine test timer |
| PERF-04 | 2D render of ≤ 500 nodes < 500 ms; pan/zoom ≥ 30 fps with ≤ 2,000 visible nodes | browser performance panel |
| PERF-05 | `impact.analyze` depth 5 on 100k edges < 300 ms | engine test |
| PERF-06 | Explain first result < 20 s (network + LLM) | desktop timer |
| PERF-07 | Runtime event to visible overlay < 1 s | end-to-end test (Phase 3) |
| PERF-08 | Engine memory < 2 GB for 1 M lines of code | task manager |
| PERF-09 | Server API P95 < 2 s at 200 concurrent users (from the scaling design) | load test (Phase 2+) |
| PERF-10 | Graph data render in browser < 500 ms (from the scaling design) | same as PERF-04 |
