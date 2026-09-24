# Git workflow

## Branches

- `main` is always green.
- `task/<TASK-ID>` per task (for example `task/P1-CORE-004`).
- `release/vX.Y` for releases.

## Commits

- Format: `<TASK-ID>: <task title>` (example: `P1-CORE-004: Node id helpers`).
- One task per branch.
- Plan changes use the prefix `PLAN:`.

## Pull requests

- One pull request per task.
- CI must pass.
- One review by the other founder for CODE modules.

## Tags

- `vX.Y.Z` semantic versioning.
- The engine and the desktop app share the version.

## Hotfixes

Branch `hotfix/<short-name>` from the release tag.
