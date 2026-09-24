# C++ standard

## Language

- C++20; no compiler extensions.
- No raw `new`/`delete` — use `std::unique_ptr` / `std::make_unique`.
- No macros except include guards and `PV_TEST_FIXTURES`.

## Naming

| Thing | Convention | Example |
|---|---|---|
| C++ namespace | `pv::<module>` | `pv::core`, `pv::graph` |
| C++ types | PascalCase | `NodeKind`, `LevelView` |
| C++ functions/variables | snake_case | `make_node_id`, `file_path` |
| C++ private members | snake_case + trailing `_` | `nodes_` |
| C++ enum values | PascalCase | `NodeKind::Function` |
| C++ files | snake_case `.hpp` / `.cpp`; tests `<name>_test.cpp` | `ids.hpp`, `ids_test.cpp` |
| GoogleTest suite names | PascalCase `<Module><Topic>` | `CoreIds`, `GraphStore` |

## Headers

- `#pragma once`.
- Include what you use.
- Include order: own header, standard library, third-party, project.

## Errors

- Throw `pv::core::PvError(code, message)`; the RPC layer turns it into a JSON-RPC error.
- Never call `exit()` inside modules.
- Log with `pv::core::log_info/log_warn/log_error` (stderr only).

## Formatting

clang-format with the repository `.clang-format`.

## Tests

- GoogleTest.
- One `_test.cpp` per source topic.
- Suite names follow the naming table (`<Module><Topic>`).
