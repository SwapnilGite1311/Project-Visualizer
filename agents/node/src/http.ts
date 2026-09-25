// HTTP requests without code changes, from Node's diagnostics channels:
// incoming (http/https servers) -> http_in; outgoing http.request -> http_out; fetch() (undici) -> http_out.
import diagnostics from 'node:diagnostics_channel';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config.js';
import { currentSpan, type SpanContext, spanStorage } from './context.js';
import { type Emit, makeEvent, newSpanId, newTraceId, nowNs } from './events.js';

interface Pending {
  start: number;
  span: SpanContext;
  parent: string | null;
}

type Subscription = [name: string, fn: (message: unknown) => void];

function pathOf(url: string | undefined): string {
  if (!url) return '/';
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

export function instrumentHttp(config: Config, emit: Emit): () => void {
  const hubHost = new URL(config.url).host; // "127.0.0.1:47100": requests to it are the agent's own and not recorded
  const sample = () => Math.random() < config.sampleRate;

  // Incoming requests: a new trace per request; the handler runs inside it.
  const serverPending = new WeakMap<IncomingMessage, Pending>();
  const onServerStart = (message: unknown) => {
    const { request } = message as { request: IncomingMessage };
    const span: SpanContext = { traceId: newTraceId(), spanId: newSpanId(), sampled: sample() };
    serverPending.set(request, { start: nowNs(), span, parent: null });
    spanStorage.enterWith(span); // the request listener is called right after, in this same execution
  };
  const onServerFinish = (message: unknown) => {
    const { request, response } = message as { request: IncomingMessage; response: ServerResponse };
    const p = serverPending.get(request);
    if (!p || !p.span.sampled) return;
    serverPending.delete(request);
    const method = request.method ?? 'GET';
    const route = pathOf(request.url);
    emit(
      makeEvent(config, 'http_in', `${method} ${route}`, {
        trace_id: p.span.traceId,
        span_id: p.span.spanId,
        start_ns: p.start,
        duration_ns: nowNs() - p.start,
        status: response.statusCode >= 500 ? 'error' : 'ok',
        attrs: { 'http.method': method, 'http.route': route, 'http.status_code': response.statusCode },
      }),
    );
  };

  // Outgoing http.request()/https.request().
  const clientPending = new WeakMap<ClientRequest, Pending>();
  const onClientStart = (message: unknown) => {
    const { request } = message as { request: ClientRequest };
    if (hostOf(request) === hubHost) return;
    begin(clientPending, request);
  };
  const onClientFinish = (message: unknown) => {
    const { request, response } = message as { request: ClientRequest; response: IncomingMessage };
    const p = clientPending.get(request);
    if (!p) return;
    clientPending.delete(request);
    finishOut(p, request.method, hostOf(request), request.path, response.statusCode ?? 0);
  };

  // fetch() goes through undici, which has its own channels.
  interface UndiciRequest {
    origin: string | URL;
    path: string;
    method: string;
  }
  const undiciPending = new WeakMap<object, Pending>();
  const onUndiciCreate = (message: unknown) => {
    const { request } = message as { request: UndiciRequest };
    if (new URL(String(request.origin)).host === hubHost) return;
    begin(undiciPending, request);
  };
  const onUndiciHeaders = (message: unknown) => {
    const { request, response } = message as { request: UndiciRequest; response: { statusCode: number } };
    const p = undiciPending.get(request);
    if (!p) return;
    undiciPending.delete(request);
    finishOut(p, request.method, new URL(String(request.origin)).host, request.path, response.statusCode);
  };
  const onUndiciError = (message: unknown) => {
    const { request } = message as { request: UndiciRequest };
    const p = undiciPending.get(request);
    if (!p) return;
    undiciPending.delete(request);
    finishOut(p, request.method, new URL(String(request.origin)).host, request.path, 0);
  };

  function begin<K extends object>(map: WeakMap<K, Pending>, key: K): void {
    const parent = currentSpan();
    const span: SpanContext = parent
      ? { traceId: parent.traceId, spanId: newSpanId(), sampled: parent.sampled }
      : { traceId: newTraceId(), spanId: newSpanId(), sampled: sample() };
    map.set(key, { start: nowNs(), span, parent: parent?.spanId ?? null });
  }

  function finishOut(p: Pending, method: string | undefined, host: string | undefined, path: string | undefined, status: number): void {
    if (!p.span.sampled) return;
    const m = method ?? 'GET';
    const route = pathOf(path);
    emit(
      makeEvent(config, 'http_out', `${m} ${host ?? ''}${route}`, {
        trace_id: p.span.traceId,
        span_id: p.span.spanId,
        parent_span_id: p.parent,
        start_ns: p.start,
        duration_ns: nowNs() - p.start,
        status: status === 0 || status >= 500 ? 'error' : 'ok',
        attrs: { 'http.method': m, 'http.host': host ?? '', 'http.route': route, 'http.status_code': status },
      }),
    );
  }

  const subscriptions: Subscription[] = [
    ['http.server.request.start', onServerStart],
    ['http.server.response.finish', onServerFinish],
    ['http.client.request.start', onClientStart],
    ['http.client.response.finish', onClientFinish],
    ['undici:request:create', onUndiciCreate],
    ['undici:request:headers', onUndiciHeaders],
    ['undici:request:error', onUndiciError],
  ];
  for (const [name, fn] of subscriptions) diagnostics.subscribe(name, fn);
  return () => {
    for (const [name, fn] of subscriptions) diagnostics.unsubscribe(name, fn);
  };
}

function hostOf(request: ClientRequest): string {
  const header = request.getHeader('host');
  return typeof header === 'string' ? header : request.host;
}
