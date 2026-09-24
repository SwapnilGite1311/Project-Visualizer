# Engine third-party libraries

| Library | Version | Folder | CMake target |
| --- | --- | --- | --- |
| GoogleTest | v1.15.2 | googletest | GTest::gtest_main |
| nlohmann/json | v3.11.3 | nlohmann_json | nlohmann_json::nlohmann_json |
| tree-sitter | v0.24.4 | tree_sitter | pv_tp_tree_sitter |
| tree-sitter-python | v0.23.6 | ts_python | pv_tp_ts_python |

## Upgrade rule

Change a version only in its own folder, re-run all engine tests, record the change in docs/decisions/versions.md.
