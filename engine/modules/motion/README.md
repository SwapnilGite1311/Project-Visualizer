# motion module

Code Motion in the engine: the statement blocks inside a function (`motion.body`) and recorded runs (`motion.load_trace`, `motion.steps`, `motion.unload`). Traces are written by the Python recorder in `recorders/python` (`pv_trace`).

## Blocks

`body_blocks(source, def_line)` parses the file with tree-sitter and walks the body of the class or function that starts on `def_line` (the whole module when it is 0). Every statement becomes a block, in the order it is written:

- `kind`: `statement`, `if`, `elif`, `else`, `for`, `while`, `try`, `except`, `finally`, `with`, `return`, `raise`, `break`, `continue`, `pass`, `def`, `class`, `match` or `case`.
- `depth` and `parent`: statements inside an `if`/loop/`try`/`with`/`case` are one level deeper, with that block as parent. `elif`, `else`, `except` and `finally` are siblings of the statement they belong to.
- `calls`: functions called by the block's own code (for an `if`, only its condition), in order, without duplicates.
- `writes`: variables assigned by the block (`x = …`, `x += …`, `for a, b in …`), or the name of a `def`/`class`.
- Nested definitions are one `def`/`class` block; their bodies are not expanded.

## Traces

A trace is a JSONL file (`contracts/motion/trace-event.schema.json`). `load_trace_file` turns every `call`, `line`, `return` and `exception` event into a step and gives it a node:

- a `call` gets the innermost node at its file and line; when a decorator line is recorded, the definition with the function's name within the next 10 lines is used instead;
- `line`, `return` and `exception` steps belong to the node of their running frame (so a `def` line executed inside a class body still belongs to the class);
- events in files that are not in the graph get an empty `node_id`.

`start` gives the command (`argv`), `end` the exit code and whether recording was cut off. Unreadable lines are counted in `skipped_lines`. `last_exception` ignores normal exits (`SystemExit: 0`, `GeneratorExit`, `StopIteration`). The engine keeps the 3 most recently loaded traces.

## Methods

- `motion.body {project_id, node_id}` → `{node_id, file_path, start_line, end_line, blocks}` for a module, class, function or method in a `.py` file.
- `motion.load_trace {project_id, path}` → `{trace_id, steps_total, truncated, exit_code, argv, skipped_lines, functions, last_exception}`.
- `motion.steps {trace_id, from, count}` → `{total, steps}` (at most 5,000 steps per call).
- `motion.unload {trace_id}` → `{removed}`.

## Limits

- Python only; other languages need their own block walker and recorder.
- Blocks come from the file on disk: if it changed after the run, lines can point at the wrong statement.
- Only the main thread is recorded, so work done in other threads is missing from traces.
- Very long traces (over 500,000 steps) are cut off and marked `truncated`.
