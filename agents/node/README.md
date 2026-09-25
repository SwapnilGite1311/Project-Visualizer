# Project Visualizer — Node.js agent

Sends what a running Node.js program does to the Project Visualizer desktop app, which shows it live on the map:

- incoming HTTP requests (any `http`/`https` server: Express, Fastify, Koa, Next.js…),
- outgoing requests (`http.request`, `fetch`),
- crashes (uncaught exceptions and unhandled promise rejections),
- the functions you wrap with `trace()`.

It needs Node.js 20 or newer and has no dependencies.

## Install

```bash
npm install ./agents/node        # or: pnpm add ./agents/node
```

(Build it once first with `pnpm install && pnpm build` in `agents/node`.) In the desktop app, open **Runtime → Connect** and copy the token.

## Start

Without changing any code:

```bash
PV_RUNTIME_TOKEN=<token> PV_PROJECT_ROOT=$PWD node --import @pv/agent-node/register app.js
```

Or from your code, as early as possible:

```js
import { start } from '@pv/agent-node';
start();
```

Settings are the same environment variables as the Python agent: `PV_RUNTIME_TOKEN` (required; without it the agent stays off), `PV_RUNTIME_URL` (default `http://127.0.0.1:47100`), `PV_PROJECT_ROOT` (default: the current folder), `PV_SERVICE`, `PV_SAMPLE_RATE` (0–1), `PV_MAX_QUEUE`, `PV_FLUSH_MS`.

The agent never changes how your program behaves: a crash still prints and exits exactly as before (the error is sent first, waiting at most 2 seconds).

## trace()

JavaScript has no cheap way to see every function call, so mark the ones that matter:

```js
import { trace } from '@pv/agent-node';

export function checkout(cart) {
  return trace('checkout', async () => {
    const total = trace('total', () => sum(cart));
    await trace('charge', () => payments.charge(total));
  });
}
```

Each `trace()` becomes a call on the map at the line where it is written; calls inside it (also after `await`) become its children, and calls made while handling an HTTP request belong to that request. When the agent is not running, `trace()` just runs the function.

## Full function tracing with OpenTelemetry

For automatic tracing of every library call, use OpenTelemetry's Node.js SDK and point its exporter at the desktop app (it accepts OTLP over HTTP with JSON):

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:47100/v1/traces
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer <token>
```

Spans with `code.filepath` and `code.lineno` attributes are placed on the exact function; others appear by service.

## Privacy

- Only names, paths of URLs (never query strings or bodies), status codes, timings, error messages and stack traces are sent.
- Headers, cookies, request and response bodies, arguments and return values are never recorded.
- Events go only to `PV_RUNTIME_URL` — your own computer by default. If the app is closed, events are dropped and your program is not slowed down.
