# Generic language framework

## Context

Phase 2 adds JavaScript, TypeScript, Java and Go next to Python. Python has a hand-written tree walker (P1-PY). Writing a new walker for every language would repeat the same nesting, qualified-name and complexity logic four more times, with four chances to get it subtly different.

## What we decided

One extractor (`engine/modules/lang_generic`) turns any tree-sitter grammar into the engine's `FileExtraction` from four query strings — definitions, imports, calls, inherits — using a fixed set of capture names (`@definition.class`, `@import.module`, `@call.name`, `@inherit.base`, …). A language module adds only its queries, its module-naming and import-resolution rules, and small post-processing when the language needs it (Java binds imported simple names, Go attaches methods to their receiver type).

## Why

- The capture names are a contract: every language produces the same shapes, so the builder, search, impact and dependency features work for all of them unchanged.
- Nesting comes from byte ranges, not from language-specific parent types, so it works for any grammar.
- The alternative — a walker per language — is more precise in corner cases but costs a week per language and drifts over time.
- Text predicates (`#eq?`) are not evaluated by our query runner, so filters that need text are expressed as captures (`@import.require_fn`).

## What we learned

- All JavaScript/TypeScript, Java and Go queries in the plan compiled against the real grammars on the first try, and all three golden fixture graphs matched the planned node and edge counts exactly — the capture contract was specific enough.
- Languages differ most in *resolution*, not extraction: files by path (JS), dotted classes under source roots (Java), directories (Go). Those rules belong in each language module; the shared path helpers (`path_module_names`, `longest_suffix_module`, `external_package_name`) cover the common cases.
- Keep one golden fixture per language with exact expected counts; it catches regressions in queries and resolution at once.
