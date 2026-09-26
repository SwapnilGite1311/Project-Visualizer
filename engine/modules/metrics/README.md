# metrics — runtime history and the ML dataset

Live runtime events (from the local hub, R12) are summed per node and per minute and kept on disk, so charts and ML can look back in time. Everything stays on the user's machine.

## Storage

- One SQLite file per project: `<data dir>/metrics/<16 hex of the project root>.db`, table `node_minute(node_id, minute, calls, errors, total_ms, p95_ms, stalls)`.
- Data dir: `PV_DATA_DIR`, else `%LOCALAPPDATA%\ProjectVisualizer` (Windows), `~/Library/Application Support/ProjectVisualizer` (macOS), `~/.local/share/project-visualizer` (Linux).
- Retention: none yet — delete the `.db` file to reset a project's history.

## Recording

The recorder listens to every runtime batch: a span counts as a call (and an error when its status is `error`), its duration feeds the minute's p95; `stall` events count as stalls; `error` events without a span count as errors only. Finished minutes are written at most every 10 s; queries flush everything first.

## RPC

- `metrics.series {project_id, node_id, metric, from_ms, to_ms, bucket_ms?}` — the node and everything below it (up to 5,000 nodes); metric `calls`, `errors`, `stalls` (sums), `error_rate` (errors / calls), `p95_ms` (max); every bucket between `from` and `to` is returned, empty ones as 0. Default bucket 1 hour.
- `metrics.export {project_id, out_path, from_ms?}` — writes the ML dataset CSV (absolute path) with columns `node_id,kind,level,minute,loc,complexity,fan_in,fan_out,calls,errors,p95_ms,stalls` (`contracts/http/ml/dataset.schema.json`); rows of nodes that no longer exist are skipped; static columns come from the current graph.
