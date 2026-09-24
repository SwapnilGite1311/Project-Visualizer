# session module

## Project states

```text
idle → scanning → parsing → linking → ready
   \______________________________/→ error   (any failure while loading)
```

- `idle` — created, the loader has not started yet.
- `scanning` — discovering files.
- `parsing` — extracting files in parallel (`files_done` / `files_total` move).
- `linking` — building nodes and edges.
- `ready` — the graph can be queried.
- `error` — loading failed; `error_message` says why.

Every change is announced with the notification `project.progress`.

## Locking

- Read the graph only inside `project->read([&](const graph::Graph& g) { ... })` (shared lock).
- Change it only inside `project->write(...)` or with `replace_graph` (unique lock).
- Never keep node or edge pointers after the lambda returns; copy what you need.

## Registry

`Registry` is passed to every module's `pv_register_<module>(Registry& reg)`:

- `methods` — add JSON-RPC methods: `reg.methods.add("ns.name", handler)`.
- `cli` — add command-line sub-commands.
- `projects` — the `ProjectManager` (open, get, get_ready, close, adopt).
- `adapters` — the language adapter registry (`reg.adapters.add(...)`).
- `notifier` — send notifications to the desktop app.
- `request_shutdown` — stop the stdio loop after the current response.

Capture the parts you need by reference in handlers; the registry lives for the whole program.

## TestEnv

Feature tests use `pv::session::TestEnv`:

```cpp
pv::session::TestEnv env(std::make_unique<pv::lang_python::PythonAdapter>());
pv_register_mymodule(*env.reg);
const std::string id = env.open_and_wait(pv::session::pyproj_small_path());
const auto result = env.call("mymodule.method", {{"project_id", id}});
```

`env.notifier` records every notification for assertions.
