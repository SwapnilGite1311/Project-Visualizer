# Language plugin packs

Ready-made definitions for languages that are not built into the engine. Each pack is data only — a `language.json`, tree-sitter queries and a `source.txt` naming the grammar — and `build_plugin.sh` turns it into an installable plugin (see `engine/modules/plugins/README.md` for how plugins work).

## Build and install

Needs git, Node.js (for `npx tree-sitter-cli`) and a C compiler (Visual Studio Build Tools on Windows, Xcode command line tools on macOS, gcc or clang on Linux).

```bash
bash engine/plugins/build_plugin.sh engine/plugins/ruby ~/.project-visualizer/languages
```

The script clones the grammar at the pinned tag, compiles it for your operating system (`ruby.dll`, `ruby.so` or `ruby.dylib`), and copies it with `language.json` and the `.scm` files into `~/.project-visualizer/languages/ruby/`. It ends with `PLUGIN READY: <folder>`. Restart Project Visualizer (or the engine): the log shows `language plugin loaded: ruby`, and `.rb` files appear on the map.

To keep plugins elsewhere, set `PV_LANG_PLUGINS_DIR` to that folder before starting the app.

## Packs

All packs are **best effort**: they were checked on small sample projects (definitions, imports between files, calls and inheritance), not on large real-world code bases.

| Pack | Files | Grammar | What is detected | Known limits |
|---|---|---|---|---|
| `ruby` | `.rb` | tree-sitter-ruby v0.23.1 | classes and modules, methods (also `def self.x`), `require_relative`, calls, `class A < B` | `require` of gems is not linked; calls through constants (`Helper.format`) are not resolved; metaprogramming (`define_method`) is not seen |
| `php` | `.php` | tree-sitter-php v0.23.11 | classes, interfaces, traits, methods, functions, `use` (matched to folders by namespace), calls (`f()`, `$this->f()`, `A::f()`), `extends`, `implements` | `require`/`include` are not followed; calls on other objects are not resolved |
| `kotlin` | `.kt` `.kts` | tree-sitter-kotlin 0.3.8 | classes, objects, functions and methods, imports (also under `src/main/kotlin`), calls, supertypes | extension functions appear under their file; calls on values are not resolved |

## Adding a pack

1. Create `engine/plugins/<lang>/` with `source.txt` (`repo=`, `tag=`, optional `subdir=` when the grammar is in a sub-folder of the repository, `lib_name=`), `language.json` (fields in the plugins README) and `definitions.scm` (plus `imports.scm`, `calls.scm`, `inherits.scm` when possible).
2. Write the queries with the node names from the grammar's `src/node-types.json`; use `tree-sitter parse <file>` in the grammar repository to see the tree of a sample file.
3. Build it with the script, open a small sample project with it, and check the result with `pv-engine stats <folder>` (or `analyze` for the full node and edge list).
