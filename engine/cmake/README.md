# Engine CMake helpers

## PvModule.cmake

`pv_add_module(NAME <name> [DEPS <targets>...] [TEST_DEPS <targets>...])` declares one engine module in one line:

- Library target `pv_<name>`, built from every `src/*.cpp` of the module (an empty placeholder source is generated when there are none yet). Public headers live in `include/`.
- `DEPS` are linked publicly to the library; `TEST_DEPS` only to the tests.
- Test executable `pv_<name>_tests`, built from every `tests/*_test.cpp`, linked with GoogleTest and registered with CTest.
- In test code, `PV_TEST_FIXTURES` is the module's own `tests/fixtures` folder and `PV_ENGINE_SOURCE_DIR` is the `engine/` folder (tests may read other modules' fixtures through it, never write them).

## GenerateRegistry.cmake

`pv_generate_registry(<output .cpp>)` finds every `engine/modules/<m>/src/register.cpp` and generates a source file with `pv::app::register_all_modules(pv::session::Registry& reg)`, which calls `pv_register_<m>(reg)` for each module in alphabetical order. Nobody edits a central list.

## Commands

Run from `engine/` (on Linux/macOS use the preset `dev-unix`):

```bash
cmake --preset dev
cmake --build --preset dev
ctest --preset dev
ctest --preset dev -R <SuiteName>
```
