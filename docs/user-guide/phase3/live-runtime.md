# Live runtime

Open your project, start your program with a small agent, and the map shows what the program is doing while it runs: which parts are busy, how calls flow between them, and every request step by step.

The desktop app listens for running programs on your own computer (`http://127.0.0.1:47100`; if that port is taken, the next free one up to 47109). Only programs that know the app's **token** can send. You find both in the **Runtime** panel at the bottom, on the **Connect** tab:

- **Address** and **Token** (hidden until you click **Show**; **Copy token** copies it).
- Ready-made commands for Python, Node.js and OpenTelemetry, with your token and project folder filled in — click **Copy** next to one and paste it in a terminal.
- **Regenerate token…** makes a new token (programs using the old one must be restarted).
- Counters: events received, sent to the map, and dropped. Events are dropped when no project is open, or when the program says it belongs to a different project folder.

Open the project **before** starting the program: events that arrive while no project is open are not kept.

## Connect a Python app

The Python agent needs **Python 3.12 or newer** (on older versions it prints a warning and stays off; your program still runs). It has no dependencies.

1. Install it once: `pip install <Project Visualizer folder>/agents/python`.
2. Copy the Python command from the Connect tab and run your program with it, for example in PowerShell:

```powershell
$env:PV_RUNTIME_TOKEN="<token>"
$env:PV_PROJECT_ROOT="C:/code/shop"
python -m pv_agent run app.py
```

Every function of your project that runs is recorded (library code is skipped). Web apps: add one line so each request becomes its own trace — `app.wsgi_app = pv_agent.PvWsgiMiddleware(app.wsgi_app)` for Flask, `application = pv_agent.PvWsgiMiddleware(application)` for Django, `app = pv_agent.PvAsgiMiddleware(app)` for FastAPI. `pv_agent.wrap_connection(conn)` times database queries. See `agents/python/README.md` for all settings.

## Connect a Node app

The Node.js agent needs Node.js 20 or newer.

1. Build and install it once: in `agents/node`, run `pnpm install` and `pnpm build`; then in your project `npm install <Project Visualizer folder>/agents/node`.
2. Start your program with it:

```powershell
$env:PV_RUNTIME_TOKEN="<token>"
$env:PV_PROJECT_ROOT="C:/code/shop"
node --import @pv/agent-node/register app.js
```

Without any code change you get incoming HTTP requests (Express, Fastify, Next.js and any `http` server), outgoing requests (`fetch`, `http.request`) and crashes. JavaScript cannot cheaply record every function, so wrap the ones you want to see: `trace('checkout', () => …)` — see `agents/node/README.md`.

## Any language with OpenTelemetry

Programs instrumented with OpenTelemetry (Java, .NET, Go, Ruby, Python, Node.js…) can send their traces directly. Set these for the program:

```text
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:47100/v1/traces
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>
```

The protocol must be `http/json` (the app does not read the binary format). Spans that carry the `code.filepath` and `code.lineno` attributes are placed on the exact function; the others appear only in the traces list.

## Reading the live map

Click **Live** in the toolbar (or press `Ctrl+Shift+L`). While your program runs:

- **Busy elements pulse** and show how many calls they had in the **last 5 seconds** (`prices.py [67]`).
- **Moving green arrows** show calls flowing from one element to another; the thicker the arrow, the more calls.
- It works **at every level**: at the top, a package lights up when anything inside it is busy; double-click it to see which modules, then which functions.
- **Health colors** stay on (see [Health and errors](health-and-errors.md)): a red element shows its error count instead of the call count (`shop [3 err]`).

The **Live** tab of the Runtime panel shows the totals: events received and kept, which programs are sending, and how long ago the last event came. **Clear data** forgets everything received so far: the live map, traces and crossings start again (the errors list has its own **Clear all** in the Errors panel).

When the program stops, the counts fade out after a few seconds.

## Traces and module crossings

**Traces** (Runtime panel) lists the most recent requests or runs — name, start time, duration, number of steps, and a red badge when something failed. Click one to see all its steps as a waterfall: indented under the step that called them, with a bar showing when and how long each ran (failed steps in red). Click a step to jump to it on the map.

- **Show on map** colors everything the request went through in blue (failures in red) and numbers the elements in the order they ran. **Clear map** removes it.
- **Follow across modules** lists how the request moved between modules: `api.py → db.py (12 ms)`.

**Crossings** is the module boundary map as a table: for the last 5 minutes, every pair of modules that called each other, with the number of calls, the average time, errors, hangs and possible loops. Rows with hangs or loops are highlighted. Click a row to color both modules (and what contains them) orange on the map; click it again to remove the color.

## Pause and replay

The live map keeps about the last 5 minutes. On the **Live** tab, click **Pause** to freeze it, then drag the slider to go back and forth; the time next to it shows which moment you are looking at. Click **Resume** to return to live (the **Live** badge shows you are live).

History is kept per level: when you move to another level, replay starts again from that moment. Traces, crossings and errors are not affected by pausing.
