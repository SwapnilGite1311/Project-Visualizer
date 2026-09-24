# Plan tools

## plan_lint.py

Checks the build plan for ownership problems: duplicate module or task IDs, files a task touches that are outside its module's **Owns** list, files owned by several modules (except the shared DEPS manifests), and files edited before they are created.

```bash
python scripts/plan/plan_lint.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md
```

The plan is valid when the summary shows `errors=0`.

## next_tasks.py

Prints the next unfinished task of every module whose **Starts after** modules are complete. A task counts as finished when `docs/status/done/<TASK-ID>.md` exists.

```bash
python scripts/plan/next_tasks.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md
```
