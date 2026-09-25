# snapshot module

Exports a project's map as one JSON document and opens a received one as a read-only project. This is how maps are shared with a team (Phase 2 cloud sharing) without sharing code.

## Format

```json
{
  "format": "pv-snapshot-1",
  "engine_version": "0.1.0",
  "label": "<project name>",
  "nodes": [ /* every node, sorted by id: id, kind, name, qualified_name, file_path, language, span, level, parent_id, metrics, health */ ],
  "edges": [ /* every edge, sorted by id: id, kind, source_id, target_id, weight, resolved */ ]
}
```

The schema is `contracts/rpc/snapshot/export.result.schema.json`. Loading rejects any other `format` value, so a future `pv-snapshot-2` can change the layout safely.

## Privacy

A snapshot contains **no source code**: only element names, file paths, line and column spans, metrics (lines, complexity, fan-in, fan-out) and the links between elements. Anyone who receives it can see how the project is organised and how big each part is, but not what the code says. File and folder names can still reveal information, so share snapshots only with people who may see the project's structure.

## Opening a snapshot

`snapshot.load {snapshot}` rebuilds the graph and registers it as a new project that is immediately ready (`ProjectManager::adopt`, labelled with the snapshot's `label`). All map, search, insight, impact and dependency features work on it. Features that need the files on disk do not: the source view (`graph.source`), Explain (its context pack needs the code), Code Motion and re-parsing after changes.
