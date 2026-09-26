# gdiff — compare two versions of a project

`gdiff.compare {base_project_id, head_project_id}` compares two open, ready projects node by node — for example an older Git commit opened as its own project (time travel, P5-DTIME) and the current code.

## Rules

- **added** — node ids only in the head; **removed** — only in the base.
- **changed** — in both, with at least one differing field among `span` (compared by line count, so code that only moved is not a change), `metrics.loc`, `metrics.complexity`, `metrics.fan_in`, `metrics.fan_out`, `parent_id`, `name`.
- **edges_added / edges_removed** — counts of edge ids only in one side.
- **packages** — for every package in either version: how many added, removed and changed nodes lie below it (added and changed counted in the head, removed in the base).

The base graph is copied first and then the head is read, so two graph locks are never held at once.

## Limits

Node ids contain the file path, so a renamed or moved file looks like "removed + added". Runtime health is not compared.
