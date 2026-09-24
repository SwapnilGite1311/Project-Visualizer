# Project Visualizer

A software digital twin: a live, explorable model of a codebase.

## Repository layout

```text
project-visualizer/
├── README.md, .gitignore, .gitattributes, .editorconfig, LICENSE      (P0-REPO)
├── .clang-format, .prettierrc.json, .prettierignore, ruff.toml          (P0-STD)
├── .github/                      workflows (ci-*: P0-CI, release-*: P1-REL), templates (P0-STD)
├── docs/                         all documentation (sub-folders owned per module)
├── contracts/                    JSON Schemas + prompt templates (single source of truth)
│   ├── tools/, package.json      (P0-CON)   validation tooling
│   ├── common/                   (P0-CON)   Node, Edge, Span, enums
│   ├── rpc/<namespace>/          (P*-CRPC)  engine RPC params/result schemas
│   ├── events/                   (P3-CRPC)  runtime event schema
│   ├── http/<service>/           (P4/P5-CRPC) HTTP API schemas
│   └── prompts/v1/, prompts/v2/  (P1-PROMPT, P4-PROMPT) LLM prompt templates
├── engine/                       C++20 core engine (process: pv-engine)
│   ├── CMakeLists.txt, CMakePresets.json, cmake/      (P1-EBOOT)
│   ├── third_party/<lib>/        (DEPS / language modules)
│   ├── modules/<module>/         include/pv/<module>/*.hpp, src/*.cpp, tests/*_test.cpp
│   └── app/                      (P1-EAPP) main.cpp → pv-engine executable
├── desktop/                      Electron + React + TypeScript desktop app
│   ├── package.json, electron.vite.config.ts, tsconfig*.json   (P1-DDEPS)
│   └── src/main/ (Node side) · src/preload/ (bridge) · src/renderer/ (React UI)
├── ai/                           Python AI/ML service (FastAPI)            [ARCH-DEPENDENT]
├── server/                       Node.js/TypeScript cloud services       [ARCH-DEPENDENT]
│   ├── libs/<lib>/ · services/<service>/ · db/migrations/
├── agents/                       runtime agents: python/, node/
├── vscode-extension/             VS Code extension
├── infra/                        compose/, nginx/, observability/, k8s/, helm/  [ARCH-DEPENDENT]
├── scripts/                      env/, plan/, release/, security/
├── website/                      landing/ (P0-VAL), marketing/ (P6-WEB)
└── business/                     Phase 6 business documents
```

## Build plan

The complete build plan is docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md.

## Status

Phase 0 in progress.
