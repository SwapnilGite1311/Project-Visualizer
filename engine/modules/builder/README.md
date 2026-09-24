# builder module

## Pipeline

`build_project(adapters, root, files, on_progress, on_phase, threads)`:

1. Report the phase `parsing`.
2. Add structure nodes: the project, one package per directory that holds source files, one module per file.
3. Extract every file in parallel (`extract_all`); a file that throws is recorded in `errors` and never stops the import.
4. Report the phase `linking`.
5. Add definition nodes (classes, functions, methods) for every extraction, build the project index, then link imports, calls and inheritance file by file.
6. Compute metrics.
7. Fill `main_guard_files` and `syntax_error_files` (sorted).

## Bindings

`link_imports` returns the file's bindings: a map from a local name to the node it refers to. The local name is the alias if there is one, else the imported symbol name, else the module text (`import os.path` binds `os.path`). Wildcard imports create an edge but no binding. External packages get an `external:<name>` node under the project.

## Call resolution

- **Plain calls** (`f()`): look for `f` in the calling scope, then each enclosing scope, then module level; then in the file's bindings; finally in every module the file imports (sorted), first match wins.
- **Self calls** (`self.f()` / `cls.f()`): find the nearest enclosing class of the caller and look for `Class.f`.
- **Other objects** (`x.f()`): if `x` is bound to a module, look for `f` in that module; to a class, look for `Class.f`; to an external package (also when only the first segment of `x` is bound), link to the external node.
- Unresolved calls and calls to the caller itself produce no edge. Repeated calls add to the edge weight.

## Metrics

- `fan_in` / `fan_out` = sum of the weights of incoming / outgoing edges of every kind.
- Definitions: `loc` = end_line − start_line + 1; `complexity` from the adapter.
- Modules: `loc` = lines of the file; `complexity` = sum of the complexity of its functions and methods.
- Packages and the project: `loc` and `complexity` = sums over their descendant modules.
