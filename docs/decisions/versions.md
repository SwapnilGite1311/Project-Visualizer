# Versions

| Tool | Required | Installed on dev machine |
|---|---|---|
| Git | 2.40+ | 2.52.0 |
| Node.js | 22 LTS or newer | v25.8.2 |
| pnpm | 10 | 10.34.5 |
| Python | 3.12 or newer | 3.11.9 (system); 3.12.14 via `uv python install 3.12` |
| uv | latest | 0.12.5 |
| CMake | 3.28+ | 3.31.6
6 (bundled with Visual Studio 2022) |
| C++ compiler | MSVC 2022 / GCC 12+ / Clang 16+ | MSVC 14.44 (Visual Studio 2022 Community) |
| tree-sitter | v0.24.4 | pinned in engine/third_party |
| tree-sitter-python | v0.23.6 | pinned in engine/third_party |
| nlohmann/json | v3.11.3 | pinned in engine/third_party |
| GoogleTest | v1.15.2 | pinned in engine/third_party |
| Docker | from Phase 2 | 29.7.2 |

## Version changes

| Date | Tool | Plan said | Chosen | Reason |
| --- | --- | --- | --- | --- |
| 2026-09-24 | vite (desktop) | latest | 7.x | electron-vite 5 only supports vite ^5, ^6 or ^7; vite 8 broke typecheck against vitest 3 |
| 2026-09-24 | @vitejs/plugin-react (desktop) | latest | 5.x | the 6.x line requires vite 8 |
