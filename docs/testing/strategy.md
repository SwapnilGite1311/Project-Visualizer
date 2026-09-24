# Test strategy

| Level | What | Where | When |
| --- | --- | --- | --- |
| Unit | one function/class | next to code | every task |
| Integration | module + real dependencies (e.g. engine + Python fixtures) | module tests folder | every task that joins modules |
| Contract | schema validity of RPC/HTTP payloads | contracts + desktop contract tests | every schema change |
| End-to-end | full app flows (Playwright/Electron) | `desktop/e2e` | nightly + before release |
| Performance | PERF targets | engine perf tests | weekly |
| AI evaluation | golden questions scored | `ai/evals` | every prompt change |
