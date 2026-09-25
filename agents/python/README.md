# Project Visualizer — Python agent

Records what a running Python program does (function calls, web requests, database queries, errors and hangs) and sends it to the Project Visualizer desktop app, which shows it live on the map.

It needs Python 3.12 or newer (it uses `sys.monitoring`) and has no dependencies.

## Install

```bash
pip install ./agents/python
```

In the desktop app, open **Runtime → Connect a program** and copy the token. The agent sends to `http://127.0.0.1:47100` unless `PV_RUNTIME_URL` says otherwise.

## Run

Without changing any code:

```bash
PV_RUNTIME_TOKEN=<token> python -m pv_agent run app.py --port 8000
```

Or start it from your own code, as early as possible:

```python
import pv_agent

pv_agent.start()
```

`python -m pv_agent check` sends one test event and prints `OK` when the app received it.

## Flask / Django / FastAPI

Each request becomes one trace, so the calls it makes are grouped together.

```python
# Flask
app.wsgi_app = pv_agent.PvWsgiMiddleware(app.wsgi_app)

# Django (wsgi.py)
application = pv_agent.PvWsgiMiddleware(get_wsgi_application())

# FastAPI / Starlette
app = pv_agent.PvAsgiMiddleware(app)
```

Call `pv_agent.start()` before wrapping. When the agent is not running, the wrappers return the app unchanged.

## Databases

Wrap any DB-API connection (sqlite3, psycopg, mysqlclient, ...) to time its queries:

```python
conn = pv_agent.wrap_connection(sqlite3.connect("shop.db"))
```

Each query is shown at the line of your code that ran it.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PV_RUNTIME_TOKEN` | (none) | Required. Without it the agent stays off. |
| `PV_RUNTIME_URL` | `http://127.0.0.1:47100` | Where the desktop app listens. |
| `PV_PROJECT_ROOT` | current folder | Only functions in files under this folder are recorded. |
| `PV_SERVICE` | folder name | Name shown for this program. |
| `PV_SAMPLE_RATE` | `1.0` | Share of traces recorded (0 to 1). |
| `PV_STALL_MS` | `5000` | A function running longer than this is reported as a hang. |
| `PV_MAX_QUEUE` | `20000` | Events kept while the app is unreachable; older ones are dropped. |
| `PV_FLUSH_MS` | `200` | How often events are sent. |

## Overhead and privacy

- Library and standard-library code is switched off after its first call, so it costs almost nothing. Your own functions cost a few microseconds per call; lower `PV_SAMPLE_RATE` for very busy programs.
- Events are sent from a background thread. If the app is closed or slow, events are dropped; your program never waits or fails because of the agent.
- Only names, file positions, timings, error messages and SQL text are sent. Argument values, variables and request bodies are not.
- Events go only to the address in `PV_RUNTIME_URL` (your own computer by default).
