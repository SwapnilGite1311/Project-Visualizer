// Converts OpenTelemetry traces (OTLP/HTTP JSON, POST /v1/traces) into runtime events (R12).
import type { RuntimeEventJson } from './batch';

const MAX_ATTRS = 30;
type Scalar = string | number | boolean;

interface OtlpValue {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
}
interface OtlpAttr {
  key?: string;
  value?: OtlpValue;
}
interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: number | string;
  startTimeUnixNano?: string | number;
  endTimeUnixNano?: string | number;
  attributes?: OtlpAttr[];
  status?: { code?: number | string; message?: string };
}

function scalar(v: OtlpValue | undefined): Scalar | undefined {
  if (!v) return undefined;
  if (typeof v.stringValue === 'string') return v.stringValue;
  if (v.intValue !== undefined && v.intValue !== null) {
    const n = Number(v.intValue);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v.doubleValue === 'number') return v.doubleValue;
  if (typeof v.boolValue === 'boolean') return v.boolValue;
  return undefined;
}

function attributes(list: unknown): Map<string, Scalar> {
  const out = new Map<string, Scalar>();
  if (!Array.isArray(list)) return out;
  for (const a of list as OtlpAttr[]) {
    const value = scalar(a?.value);
    if (typeof a?.key === 'string' && value !== undefined) out.set(a.key, value);
  }
  return out;
}

function nanos(v: unknown): bigint {
  try {
    return typeof v === 'string' || typeof v === 'number' ? BigInt(v) : 0n;
  } catch {
    return 0n;
  }
}

// OTLP JSON uses numbers (2) but some exporters send the enum names ("SPAN_KIND_SERVER").
function enumValue(v: unknown, names: string[]): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return names.indexOf(v);
  return 0;
}
const SPAN_KINDS = [
  'SPAN_KIND_UNSPECIFIED',
  'SPAN_KIND_INTERNAL',
  'SPAN_KIND_SERVER',
  'SPAN_KIND_CLIENT',
];
const STATUS_CODES = ['STATUS_CODE_UNSET', 'STATUS_CODE_OK', 'STATUS_CODE_ERROR'];

function kindOf(span: OtlpSpan, attrs: Map<string, Scalar>): RuntimeEventJson['kind'] {
  const kind = enumValue(span.kind, SPAN_KINDS);
  if (kind === 2 && (attrs.has('http.method') || attrs.has('http.request.method')))
    return 'http_in';
  if (kind === 3) return attrs.has('db.system') ? 'db_query' : 'http_out';
  return 'call';
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function otlpToEvents(body: unknown, serviceFallback: string): RuntimeEventJson[] {
  const events: RuntimeEventJson[] = [];
  for (const rs of asArray((body as { resourceSpans?: unknown })?.resourceSpans) as Array<
    Record<string, unknown>
  >) {
    const resource = attributes((rs?.resource as { attributes?: unknown })?.attributes);
    const serviceName = resource.get('service.name');
    const service = typeof serviceName === 'string' && serviceName ? serviceName : serviceFallback;
    for (const ss of asArray(rs?.scopeSpans) as Array<Record<string, unknown>>) {
      for (const span of asArray(ss?.spans) as OtlpSpan[]) {
        if (
          !span ||
          typeof span.traceId !== 'string' ||
          !span.traceId ||
          typeof span.spanId !== 'string' ||
          !span.spanId
        )
          continue;
        const attrs = attributes(span.attributes);
        const start = nanos(span.startTimeUnixNano);
        const end = nanos(span.endTimeUnixNano);
        const failed = enumValue(span.status?.code, STATUS_CODES) === 2;
        const filePath = attrs.get('code.filepath') ?? attrs.get('code.file.path');
        const line = Number(attrs.get('code.lineno') ?? attrs.get('code.line.number') ?? 0);
        events.push({
          v: 1,
          event_id: `${span.spanId}-${String(span.startTimeUnixNano ?? '0')}`,
          trace_id: span.traceId,
          span_id: span.spanId,
          parent_span_id: span.parentSpanId || null,
          kind: kindOf(span, attrs),
          name: typeof span.name === 'string' ? span.name : '',
          file_path: typeof filePath === 'string' ? filePath : '',
          line: Number.isInteger(line) && line > 0 ? line : 0,
          start_ns: Number(start > 0n ? start : 0n),
          duration_ns: Number(end > start ? end - start : 0n),
          status: failed ? 'error' : 'ok',
          error: failed ? { type: 'Error', message: span.status?.message ?? '', stack: '' } : null,
          attrs: Object.fromEntries([...attrs].slice(0, MAX_ATTRS)),
          service,
        });
      }
    }
  }
  return events;
}
