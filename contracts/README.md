# Contracts

JSON Schemas and prompt templates: the single source of truth for every payload exchanged between the engine, the desktop app, the server and the AI service.

## Rules

- JSON Schema draft 2020-12.
- Every schema has `"$schema": "https://json-schema.org/draft/2020-12/schema"` and `"$id": "https://pv.local/schemas/<path relative to contracts/>"`.
- Field names are snake_case.
- `"additionalProperties": false` on every object unless stated.

## Layout

- `common/` — shared types (Node, Edge, Span, enums).
- `rpc/<namespace>/<method>.params.schema.json` and `.result.schema.json` — engine RPC.
- `events/` — runtime event schema.
- `http/<service>/` — HTTP API schemas.
- `prompts/v1|v2/` — LLM prompt templates.

## Examples

Each schema folder may have `examples/<schema-base>.<n>.json`. `<schema-base>` is the schema file name without `.schema.json` (example: `examples/node.1.json` is validated against `node.schema.json` in the parent folder).

## References

Use relative `$ref`, for example `"$ref": "../../common/node.schema.json"`.

## Commands

```bash
pnpm install
pnpm validate
```
