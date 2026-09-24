# Phase 1 sign-off

Both founders tick every box (P1-SIGN-002). Notes in *italics* are the automated status on 2026-09-24; they do not replace the founders' own check.

## Modules

- [ ] P1-EBOOT — Engine build system
- [ ] P1-EDEPS — Engine third-party libraries
- [ ] P1-CORE — Core types and utilities
- [ ] P1-GRAPH — In-memory graph store and level views
- [ ] P1-FS — File discovery
- [ ] P1-RPC — JSON-RPC framing, method table and stdio server
- [ ] P1-PARSE — Parsing framework (language-neutral)
- [ ] P1-PY — Python language adapter
- [ ] P1-BUILDR — Graph builder
- [ ] P1-SESS — Projects, background loading and registry
- [ ] P1-EAPP — pv-engine executable
- [ ] P1-GAPI — Graph query RPC methods
- [ ] P1-IMPACT — "What breaks if I change this?"
- [ ] P1-CTX — AI context packs
- [ ] P1-CRPC — Phase 1 RPC contracts (JSON Schemas)
- [ ] P1-PROMPT — Prompt templates v1
- [ ] P1-DDEPS — Desktop project setup and dependencies
- [ ] P1-DENG — Engine process client (main process)
- [ ] P1-DPRE — Preload bridge and shared bridge types
- [ ] P1-DMAIN — Main process core and basic IPC handlers
- [ ] P1-DSHELL — Renderer shell (layout, registry, store, UI kit)
- [ ] P1-DAPI — Renderer API layer
- [ ] P1-DAI — AI service in the main process (direct mode)
- [ ] P1-DVIEW — Render-agnostic view core and canvas
- [ ] P1-D2D — 2D renderer (Cytoscape)
- [ ] P1-DIMPORT — Welcome screen and project opening
- [ ] P1-DNAV — Navigation (breadcrumb and history)
- [ ] P1-DINSP — Inspector panel
- [ ] P1-DIMPACT — "What breaks if I change this?" UI
- [ ] P1-DEXPL — "Explain this" UI
- [ ] P1-DSET — Settings UI
- [ ] P1-MVP — MVP checkpoint *(P1-MVP-002 run with a fake LLM; needs a real LLM key, a real project and founder sign-off)*
- [ ] P1-SRCH — Search engine module
- [ ] P1-ANLYS — Software intelligence layer (analysis)
- [ ] P1-CLI — Headless command-line mode
- [ ] P1-EPERF — Engine performance tests
- [ ] P1-PYNB — Jupyter notebook support
- [ ] P1-DGIT — Import from Git
- [ ] P1-DINPUT — Code snippet and context input
- [ ] P1-DSRCH — Search panel
- [ ] P1-DINSI — Insights panel
- [ ] P1-D3D — 3D renderer and view mode *(double-click drill-down inside 3D still to be checked by hand)*
- [ ] P1-DEXPLORE — Multi-level exploration extras
- [ ] P1-DE2E — End-to-end and contract tests
- [ ] P1-REL — Packaging and release *(open: app icon 001, GitHub owner in `electron-builder.yml` 002, first installer build 003, tag push 004, clean-machine smoke test 006)*
- [ ] P1-UDOC — User guide
- [ ] P1-UT — User testing with 15–20 users *(plan, recruiting and script written; sessions 003 and findings 004 open)*

## Checks

- [ ] `python scripts/plan/plan_lint.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md` → `errors=0` *(modules=182 tasks=828 errors=0)*
- [ ] Engine `ctest --preset dev` all green *(165/165 passed; the 3 perf tests are skipped in Debug)*
- [ ] Desktop `pnpm typecheck && pnpm lint && pnpm test` green *(268 tests in 107 files passed)*
- [ ] `pnpm exec playwright test` green *(19 passed: 18 engine contract tests + app smoke test)*
- [ ] `PV_RUN_PERF=1` perf tests pass *(3/3 passed on the Release build)*
- [ ] Installer smoke test passed (`scripts/release/RELEASE_LOG.md`) *(not run yet)*
- [ ] User testing findings written (`docs/research/mvp-testing/findings.md`) *(not run yet)*

## Sign-off

| Founder | Date | Signature |
| --- | --- | --- |
| | | |
| | | |
