# End-to-end tests

These tests run the real engine and the real desktop app. They are slower than the unit tests, so they are not part of `pnpm test`.

## Prerequisites

- The engine is built (`cd engine && cmake --preset dev && cmake --build --preset dev`). The tests look for `pv-engine` in the same places as the app in development (Debug build first), or use `PV_ENGINE_PATH` if it is set.
- For the app test, the desktop app is built: `cd desktop && pnpm build`.

## Run

```bash
cd desktop
pnpm exec playwright test e2e/contract   # engine output vs. contracts/ JSON Schemas
pnpm build && pnpm exec playwright test e2e/app   # launches the built app
pnpm test:e2e                             # everything
```

## What is covered

- `contract/engine-contract.spec.ts`: opens the `pyproj_small` fixture in a real engine and validates the result of 18 RPC methods (`engine.ping` … `analysis.call_tree`) against `contracts/rpc/**/*.result.schema.json`.
- `app/open-project.spec.ts`: starts the built app with a fresh profile, waits for the engine, opens the fixture from the recent projects list and checks that the breadcrumb and the map canvas appear.
