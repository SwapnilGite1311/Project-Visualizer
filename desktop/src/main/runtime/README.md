# Runtime hub

The desktop app listens on `127.0.0.1:47100` for events from running programs (the Python and Node agents, or any OpenTelemetry-instrumented app) and forwards them to the engine (`runtime.ingest`) for the project that is open. If 47100 is busy, the next free port up to 47109 is used; the Connect panel shows the actual address.

- `batch.ts`: checks agent batches and keeps only the fields of the event contract.
- `otlp.ts`: converts OTLP/HTTP JSON traces into events.
- `hub-server.ts`: the HTTP server.
- `forwarder.ts`: queues events and sends them to the engine every 200 ms, in chunks of 500.
- `../handlers/runtime.ts`: starts both with the app and exposes `pv:runtime.hubInfo`, `pv:runtime.setActiveProject` and `pv:runtime.regenerateToken`.

## Endpoints

| Method and path   | Body                                                                              | Reply                            |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| `GET /healthz`    | none                                                                              | `{"ok": true}` (no token needed) |
| `POST /v1/events` | `{"source": {...}, "events": [...]}` (contracts/events/runtime-batch.schema.json) | `{"accepted": n, "rejected": m}` |
| `POST /v1/traces` | OTLP/HTTP JSON (`resourceSpans`)                                                  | `{"accepted": n, "rejected": 0}` |

Errors: 400 (not JSON, or not a batch), 401 (token), 404 (other paths), 413 (too large). Invalid events inside a batch are skipped and counted in `rejected`; the rest is accepted.

## Authentication

Every `POST` needs `Authorization: Bearer <token>`. The token is 32 hex characters, created on first start and saved in the setting `runtime.token`; "Regenerate token" in the Connect panel replaces it at once (programs using the old token get 401). For OpenTelemetry set `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>`.

Events are accepted only while a project is open. If a batch's `source.project_root` is set and is not the open project's folder (compared without regard to slashes, and case-insensitively on Windows), its events are dropped and counted.

## OTLP mapping

| Span field                                                    | Event field                                          |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `traceId`, `spanId`, `parentSpanId`                           | `trace_id`, `span_id`, `parent_span_id`              |
| `spanId` + `-` + `startTimeUnixNano`                          | `event_id`                                           |
| `name`                                                        | `name`                                               |
| `kind` 2 (server) with `http.method` or `http.request.method` | `kind: "http_in"`                                    |
| `kind` 3 (client) with `db.system` / without                  | `kind: "db_query"` / `"http_out"`                    |
| any other kind                                                | `kind: "call"`                                       |
| attribute `code.filepath` (or `code.file.path`)               | `file_path`                                          |
| attribute `code.lineno` (or `code.line.number`)               | `line`                                               |
| `startTimeUnixNano`, `endTimeUnixNano − startTimeUnixNano`    | `start_ns`, `duration_ns`                            |
| `status.code` 2 (error), `status.message`                     | `status: "error"`, `error: {type: "Error", message}` |
| string, number and boolean attributes (first 30)              | `attrs`                                              |
| resource attribute `service.name` (else `otlp`)               | `service`                                            |

## Limits

- Bound to `127.0.0.1` only: other computers cannot connect (SEC-05).
- A request body may be at most 5 MB; a batch at most 5,000 events.
- At most 50,000 events wait for the engine; beyond that the oldest are dropped (`dropped_overflow`).
