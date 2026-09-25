# Snapshot privacy

## Context

Teams want to share a project's map (Phase 2 cloud sharing), but many projects are private and their owners will not upload source code to another service. The snapshot format (`engine/modules/snapshot`, `pv-snapshot-1`) decides what leaves the user's computer when a map is shared.

## What we decided

A snapshot contains the graph only: element ids, names, kinds, file paths, line and column spans, metrics (lines, complexity, fan-in, fan-out), health and the links between elements. It never contains source code, docstrings or signatures. A received snapshot opens as a read-only project; features that need the files (source view, Explain, Code Motion) are unavailable for it.

## Why

- The map, search, insights, impact and dependency features only need the graph, so sharing the graph gives teammates almost everything.
- Keeping code out makes the privacy promise simple to state and easy to check: `export_snapshot` is built from `all_nodes()` and `all_edges()` only, and a test checks the output contains no code.
- Explain would need code, so it stays a local feature; this keeps AI context under the owner's control.

## What we learned

- File and folder names can themselves be sensitive (customer names, unreleased products); the user guide says to share snapshots only with people allowed to see the project's structure.
- A versioned `format` field (`pv-snapshot-1`) with strict rejection of unknown versions lets the format change later without silently misreading old files.
