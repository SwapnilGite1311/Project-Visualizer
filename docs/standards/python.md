# Python standard

## Version

Python 3.12 or newer.

## Style

- `ruff format` and `ruff check` with the repository `ruff.toml`.
- Type hints on all public functions.

## Naming

Modules and functions use snake_case, classes use PascalCase, tests are named `test_<name>.py` (example: `explain_node.py`).

## Packaging

uv with a `pyproject.toml` per project.

## Errors and logging

- Use the `logging` module with the JSON formatter from `pv_ai.core.logging`.
- HTTP errors return `{"error":{"code":"<string>","message":"<text>"}}`, the same shape as the server.
- Never log API keys, passwords, tokens or full source code of user files.

## Tests

pytest; tests never use the network.
