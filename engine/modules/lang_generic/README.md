# lang_generic

One extractor for every tree-sitter language: a language is described by four query strings (plus a few settings in `QuerySpec`), and `extract_with_queries` turns a file into the same `FileExtraction` the Python adapter produces (definitions, imports, calls, inheritance). New languages add queries and resolution rules, not a new walker. To add a grammar and a language, follow `GRAMMAR_TEMPLATE.md`.

## Capture names

| Query | Captures |
| --- | --- |
| definitions | the whole node as `@definition.class`, `@definition.interface`, `@definition.function` or `@definition.method`; its name node as `@name` |
| imports | `@import.module` (required, quotes/brackets stripped), optional `@import.name`, `@import.alias`, `@import.default` (default-import local name → name `default`), `@import.namespace` (namespace alias → name empty), `@import.wildcard` (sets name `*`), `@import.require_fn` (the match is kept only if its text equals the spec's `require_function`) |
| calls | `@call.name` (required), optional `@call.object` |
| inherits | `@inherit.class` (the class's **name** node), `@inherit.base` |

## Nesting rules

- Definitions are sorted by position (outer before inner) and nested by byte ranges: a definition inside another one gets `Parent.name` as its qualified name.
- Classes and interfaces become kind `class`; functions and methods become kind `function`. A function whose parent is a class is a method (`parent_is_class`).
- A repeated qualified name gets `~2`, `~3`, … (same rule as Python), so ids stay unique.
- Complexity = 1 + the number of nodes whose type is in `decision_node_types`, not counting nested definitions.
- Imports and calls belong to the innermost definition that contains them (`scope_qualname`, `caller_qualname`; `""` means module level).

## Predicates

Text predicates in queries (`#eq?`, `#match?`, …) are **not** evaluated by the extractor, so a query must not rely on them to filter matches. Use the captures instead; for example, CommonJS `require("x")` calls are recognised with `@import.require_fn`, and the match is kept only when that capture's text equals `QuerySpec::require_function`.

## Helpers

`path_modules.hpp` has helpers for languages that import files by path or directory:

- `path_module_names("src/a/index.js")` → `{"src/a/index", "src/a"}` (an `index` file also names its folder).
- `resolve_relative_path("src/a/m.js", "./x.js", {".js"})` → `"src/a/x"`.
- `longest_suffix_module(index, "github.com/acme/shop/internal/store")` → the longest known module the import path ends with (Go).
- `external_package_name("@scope/pkg/sub")` → `"@scope/pkg"`; `"lodash/fp"` → `"lodash"`; `"node:fs"` stays as it is.
- `strip_quotes` removes surrounding `""`, `''`, backticks or `<>`.
