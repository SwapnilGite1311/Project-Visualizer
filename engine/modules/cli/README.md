# cli module

Headless commands for CI, scripts and the future server parse-worker. They load the project exactly like the desktop app does, without any UI.

## analyze

```bash
pv-engine analyze <root> [--out <file>] [--exclude <glob>]...
```

Writes one JSON object with `engine_version`, `root_path`, `nodes`, `edges`, `errors`, `main_guard_files` and `syntax_error_files` — to `<file>` when `--out` is given, otherwise to stdout. Nodes and edges use the same shape as the RPC contracts.

## stats

```bash
pv-engine stats <root> [--exclude <glob>]...
```

Prints one line per node kind (`project: 1`, `package: 2`, `module: 8`, …), then `edges: <n>` and `errors: <n>`.

## Exit codes

- `0` — success.
- `1` — the project could not be loaded (the reason is printed to stderr) or the output file could not be written.
- `2` — usage error (missing root or unknown flag).
