# locate module

Turns "a file and a line" into an element of the map. Used by the VS Code bridge ("show on map"), pasted stack traces and runtime events.

## Paths

- A path is **absolute** when it starts with `/` or a drive letter (`C:`); it is made relative to the project root. A path outside the root gives no node.
- Any other path is treated as already relative to the project root.
- Backslashes become `/` and `.`/`..` segments are resolved.
- On Windows the root prefix is compared without case (`c:/Code/p` matches `C:/code/p`), but the rest of the path must use the same case as the file on disk, because element ids are case-sensitive.

## Methods

- `locate.node_at {project_id, file_path, line}` → `{node}`: the innermost class, function or method whose lines contain `line`, else the module; `null` when the file is not part of the project. `line` must be 1 or more.
- `locate.file_nodes {project_id, file_path}` → `{nodes}`: every element of the file, sorted by start line, then id (the module comes first).
