# Phase 5 sign-off

Both founders tick every box (P5-SIGN-002). Notes in *italics* are the automated status on 2026-09-26; they do not replace the founders' own check.

## Modules

- [ ] P5-AIDEPS — ML dependencies
- [ ] P5-MLBASE — ML core (datasets, features, model store)
- [ ] P5-MLFAIL — Failure pattern prediction
- [ ] P5-MLBOT — Bottleneck prediction
- [ ] P5-MLFC — Health forecasting
- [ ] P5-MLREC — Decision recommendation engine
- [ ] P5-MLANOM — Anomaly detection
- [ ] P5-SMLGW — ML gateway service *(not built: it needs the server foundations P2-SBASE, P2-SDB and P2-SAUTH, which are not built yet. Until then the desktop's `pv:ml.*` channels have no server to call and every Phase 5 feature runs locally.)*
- [ ] P5-CRPC — Phase 5 contracts
- [ ] P5-GDIFF — Graph diff (time travel)
- [ ] P5-METRIC — Metrics history (SQLite) and dataset export
- [ ] P5-SIM — What-if simulation engine
- [ ] P5-DHIST — Git history access (main process)
- [ ] P5-DTIME — Time-travel view
- [ ] P5-DREC — Recommendation card (local rules)
- [ ] P5-DSIM — Simulation workspace
- [ ] P5-DML — ML access (main process)
- [ ] P5-DPRED — Prediction UI *(overlay priority 31 instead of 25, drawn as a ring and a badge so health stays visible; recorded in the plan)*
- [ ] P5-DFC — Health forecast UI *(indicator priority 32 instead of 26; only hours with calls count as history; recorded in the plan)*
- [ ] P5-UDOC — User guide for Phase 5

## Checks

- [ ] `python scripts/plan/plan_lint.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md` → `errors=0` *(modules=197 tasks=910 errors=0)*
- [ ] Engine `ctest --preset dev` all green *(361/361 passed; the perf tests are skipped in Debug)*
- [ ] Desktop `pnpm typecheck && pnpm lint && pnpm test` green *(560 tests in 195 files passed)*
- [ ] `pnpm exec playwright test` green *(19 passed)*
- [ ] AI service `uv run pytest` and `uv run ruff check .` green *(52 passed; ruff clean)*
- [ ] Manual: a sandbox with a deleted function shows failures from replayed traces *(real app, automated run: `is_valid` removed in a sandbox, the recorded requests replayed, simulated failures above real ones, Decision says No-go, the real map unchanged after Exit — 12/12 checks passed)*
- [ ] Manual: time travel between two commits *(real app, automated run: commit list, per-package changes, `new`/`changed` marks, Show this version (read-only), Back to current, Clear — 9/9 checks passed)*
- [ ] Manual: forecast chart with ≥ 48 h of data *(real app with 48 hours of backdated agent events: 48 hours of history and a 24-hour forecast, confidence 100%, the rising error rate forecast as Failing, the spike hour marked unusual; readable at 860×560, 1366×768 and maximized. Still to do by hand on a program that really ran for two days.)*
- [ ] Manual: local and Python recommendation give the same verdict on 5 cases *(5/5 identical: verdict, confidence, reasons, actions and text — low-risk preview, critical preview, failing replay, slowdown with a risky prediction, high-risk preview with a static simulation and forecasts)*
- [ ] Manual: Predictions offline *(real app: after a run with failing calls, Predict now lists `add` first with its factors, the ring and `30% risk` badge show on the function and its package, clicking reveals it; checked at three window sizes)*
- [ ] Cloud path: train a model, predict with it, cloud forecast *(waits for P5-SMLGW and the server foundations)*

## Sign-off

| Founder | Date | Signature |
|---|---|---|
| | | |
| | | |
