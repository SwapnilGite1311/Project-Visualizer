# Parser component

## Responsibility

Turn source files into a raw extraction per file: definitions (classes, functions, methods, variables), imports, calls and inheritance. The builder (P1-BUILDR) turns extractions into the graph.

## Pipeline

1. File discovery (`fs`): walk the project root, apply exclude globs.
2. Language detection by file extension (adapter registry).
3. tree-sitter parse of the file.
4. Query captures (`@definition.*`, `@name`, `@import.*`, `@call.*`, `@inherit.*`) or a language walker.
5. Output: one `FileExtraction` per file.

## Adapter interface

Every language implements `LanguageAdapter`:

- `id` — language id, for example `python`.
- `extensions` — file extensions, for example `.py`.
- `extract` — source text → `FileExtraction`.
- `module_name` — file path → language-level module name (for example `app.main`).
- `resolve_import` — import text + importing file → target module path or external name.
- `self_keyword` — the receiver keyword used to resolve method calls (`self`, `this`).

## Error tolerance

tree-sitter keeps parsing after syntax errors. The extraction carries a `has_syntax_errors` flag; a broken file never stops the import (REL-02).

## Performance

- One tree-sitter parser per thread.
- Queries are compiled once per adapter and reused.
