# Adding a tree-sitter grammar

Every language grammar lives in its own folder `engine/third_party/ts_<lang>/` and is picked up automatically by `engine/third_party/CMakeLists.txt` (alphabetical). Use this file as the template for `engine/third_party/ts_<lang>/CMakeLists.txt`; replace `<lang>`, `<repo>`, `<tag>` and `<src_dir>`.

- `<repo>`: the grammar's GitHub repository, for example `tree-sitter/tree-sitter-javascript`.
- `<tag>`: a released tag, for example `v0.23.1` (record it in `docs/decisions/versions.md`).
- `<src_dir>`: the folder that contains `parser.c` — usually `src`; some repositories hold several grammars (TypeScript: `typescript/src` and `tsx/src`).

```cmake
FetchContent_Declare(ts_<lang>
  URL https://github.com/<repo>/archive/refs/tags/<tag>.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_<lang>)

set(ts_<lang>_sources ${ts_<lang>_SOURCE_DIR}/<src_dir>/parser.c)
if(EXISTS ${ts_<lang>_SOURCE_DIR}/<src_dir>/scanner.c)
  list(APPEND ts_<lang>_sources ${ts_<lang>_SOURCE_DIR}/<src_dir>/scanner.c)
endif()

add_library(pv_tp_ts_<lang> STATIC ${ts_<lang>_sources})
target_include_directories(pv_tp_ts_<lang> PRIVATE ${ts_<lang>_SOURCE_DIR}/<src_dir>)
target_link_libraries(pv_tp_ts_<lang> PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_<lang> PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_<lang> PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_<lang> PRIVATE -w)
endif()
```

`SOURCE_SUBDIR pv_no_cmake` stops CMake from running the grammar repository's own build files; we compile `parser.c` (and `scanner.c` when the grammar has one) ourselves.

In the language module, declare the grammar's entry point with C linkage:

```cpp
extern "C" const TSLanguage* tree_sitter_<lang>(void);
```

## Checklist: adding a language

1. **Grammar folder:** `engine/third_party/ts_<lang>/CMakeLists.txt` from the template above; the version recorded in `docs/decisions/versions.md`.
2. **Language module:** `engine/modules/lang_<id>/` with `pv_add_module(NAME lang_<id> DEPS pv_lang_generic pv_tp_ts_<lang> pv_session)`.
3. **Queries:** the four query strings using the capture names in `README.md` (definitions, imports, calls, inherits) and the list of decision node types for complexity. Test every query on small sources first; tree-sitter reports the offset of a bad query.
4. **Adapter class:** implements `parse::LanguageAdapter` — id, file extensions, `extract()` via `extract_with_queries`.
5. **Module names:** how a file is named when others import it (dotted package path, file path without extension, directory for Go…); use `path_module_names` for path-based languages.
6. **Resolution:** how an import becomes a file or an external package (`resolve_relative_path`, `longest_suffix_module`, `external_package_name`).
7. **Fixture project:** a tiny realistic project under `tests/fixtures/<lang>proj_small/` with packages, classes, calls across files, an external import and one file with a syntax error.
8. **Golden test:** open the fixture and compare node ids and edge ids with an expected list.
9. **Register:** `src/register.cpp` adds the adapter to the registry so the engine discovers it.
10. **README:** what is detected and the known limits (this list is copied into the user guide's languages page).
