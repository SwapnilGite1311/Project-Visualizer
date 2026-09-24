# parse module

## Raw extraction

Every language adapter turns one source file into a `FileExtraction`:

- `RawDefinition` — a class or function (a method is a function with `parent_is_class = true`), with its unique in-file `qualname`, span, complexity, signature and docstring.
- `RawImport` — one imported module or symbol, as written in the source, with its alias, line and enclosing scope.
- `RawCall` — one call site: the called name, the object before the last `.` (for example `self`), the line and the calling definition.
- `RawInherit` — one base class of a class, as written.
- File-level facts: `loc`, `has_syntax_errors`, `has_main_guard`, `module_docstring`.

The builder (P1-BUILDR) turns extractions into graph nodes and edges; adapters never touch the graph.

## Writing an adapter

1. Create an engine module `lang_<id>` (for example `lang_python`).
2. Implement `LanguageAdapter`: `id`, `extensions`, `extract`, `module_names`, `resolve_import`, `self_keyword`.
3. Produce unique qualnames: the second definition with the same qualname in one file gets `~2`, the third `~3`, and so on.
4. Set `parent_is_class = true` for functions defined directly inside a class (methods).
5. Register the adapter in `src/register.cpp`: `reg.adapters.add(std::make_unique<YourAdapter>());`.

## Resolution contract

`resolve_import` returns an `ImportTarget`:

- `node_id` set — the import points to a project node (a module, class or function).
- `external_name` set — the import points to a package outside the project (top-level name, for example `numpy`).
- both empty — the import could not be resolved; the builder records it as unresolved.

## Thread safety

- Create one `TsParser` per call (parsers are not shared between threads).
- A `TsQuery` may be compiled once and shared read-only between threads.
- `ProjectIndex` is built first and then only read during resolution.
