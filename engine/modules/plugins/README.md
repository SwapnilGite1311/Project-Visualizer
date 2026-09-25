# plugins — languages without recompiling the engine

At start, the engine loads every **language plugin** it finds: a folder with a `language.json`, up to four tree-sitter query files and a compiled tree-sitter grammar (a shared library). The plugin then works like a built-in language: files with its extensions are parsed, and their classes, functions, imports, calls and inheritance appear on the map.

Plugins are looked for in `PV_LANG_PLUGINS_DIR` (several folders separated by `;` on Windows, `:` elsewhere), or else in `~/.project-visualizer/languages/`. Ready-made packs (Ruby, PHP, Kotlin) and a build script are in `engine/plugins/`.

## Folder layout

```text
~/.project-visualizer/languages/
  ruby/
    language.json      the description (below)
    ruby.dll           the compiled grammar (.dll on Windows, .so on Linux, .dylib on macOS)
    definitions.scm    required: classes, functions, methods
    imports.scm        optional
    calls.scm          optional
    inherits.scm       optional
```

## language.json

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Lower-case letters, digits and `_` (`ruby`). Must not be a built-in language's id. |
| `extensions` | yes | File extensions, each starting with a dot (`[".rb"]`). Must not be claimed by another language. |
| `library` | yes | The grammar library's file name, inside the plugin folder. |
| `symbol` | yes | The grammar's entry function, `tree_sitter_<name>` (`tree_sitter_ruby`). |
| `module_naming` | yes | How files are named for imports: `path` (`lib/a/b.rb` → `lib/a/b`), `dotted` (`com/acme/Util.kt` → `com.acme.Util`), `directory` (the folder, for namespace languages like PHP). |
| `resolution` | yes | How imports find files: `relative_path` (paths relative to the file, like `require_relative`; bare names that are not project files become external packages), `dotted` (dotted module names, also matching files under source roots like `src/main/kotlin`), `suffix` (the project path or folder that ends with the import), `none`. |
| `self_keyword` | no | `this` (default), `self`… — calls on it resolve inside the class. |
| `require_function` | no | For imports written as calls (`require_relative "x"`): only calls to this function count (used with the `@import.require_fn` capture). |
| `decision_node_types` | no | Node types that add 1 to complexity (`["if", "while", "when"]`). |

## Building a grammar library

Inside a grammar repository (for example a clone of `tree-sitter/tree-sitter-ruby`), with Node.js and a C compiler installed:

```bash
npx tree-sitter-cli build --output ruby.dll    # ruby.so on Linux, ruby.dylib on macOS
```

The ABI of the grammar must be supported by the engine's tree-sitter (v0.24: grammars generated for ABI 13–15). `engine/plugins/build_plugin.sh` does the clone, build and copy in one command.

## Query captures

The `.scm` files use the same capture names as the built-in query languages — `@definition.class`, `@definition.function`, `@definition.method`, `@definition.interface` with `@name`; `@import.module` (and `@import.name`, `@import.alias`, `@import.wildcard`, `@import.require_fn`); `@call.name` with an optional `@call.object`; `@inherit.class` and `@inherit.base`. See `engine/modules/lang_generic/README.md` for the details and examples. The node type names come from the grammar's `src/node-types.json`.

## Troubleshooting

The engine writes one line per plugin on stderr at start (the desktop app's log shows it):

- `language plugin loaded: <id>` — ready.
- `language plugin skipped: <folder>: language.json: <field>: <reason>` — fix the named field.
- `…: cannot load library: <path>` — the library is missing, built for another operating system or processor (a 32-bit or ARM build on x64 Windows), or depends on a missing runtime.
- `…: symbol: tree_sitter_x not found` — the `symbol` does not match the grammar's name (see `src/parser.c`, near the end).
- `…: conflict` — the id or an extension is already used by a built-in language or another plugin.
- A query error names the `.scm` file and the offset of the problem: compare the node names with `src/node-types.json` of the grammar.
