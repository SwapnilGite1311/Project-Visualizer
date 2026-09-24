# CI stages

1. Format / lint
2. Build
3. Unit tests
4. Contract validation
5. Integration tests
6. Package (release branches only)
7. End-to-end (nightly)
8. Plan lint (when the plan changes)

## Path filters

Each workflow runs only when its folder changes: `engine/**`, `desktop/**`, `server/**`, `ai/**`, `agents/**`, `vscode-extension/**`, `contracts/**`, `docs/plan/**`.
