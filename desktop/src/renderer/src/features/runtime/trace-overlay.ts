import type { NodeStyle, Overlay } from '../../core/overlay';
import type { Crossing, TraceStep } from './runtime-api';

const TRACE = '#38bdf8';
const TRACE_ERROR = '#ef4444';
const CROSSING = '#f97316';

const visible = (id: string) => id !== 'project:';

// One request on the map: every element it ran through (and the packages containing it) in blue, failures in red,
// and the order of the steps as badges.
export function buildTraceOverlay(
  steps: TraceStep[],
  ancestorsById: Record<string, string[]>,
): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  const mapped = steps.filter((s) => s.node_id);
  for (const s of mapped) {
    for (const id of (ancestorsById[s.node_id] ?? [s.node_id]).filter(visible)) {
      if (nodes[id]?.color !== TRACE_ERROR) nodes[id] = { ...nodes[id], color: TRACE };
    }
  }
  for (const s of mapped.filter((x) => x.status === 'error')) {
    for (const id of (ancestorsById[s.node_id] ?? [s.node_id]).filter(visible))
      nodes[id] = { ...nodes[id], color: TRACE_ERROR };
  }
  const order = new Map<string, number[]>();
  mapped.forEach((s, i) => order.set(s.node_id, [...(order.get(s.node_id) ?? []), i + 1]));
  for (const [id, numbers] of order) {
    if (!visible(id)) continue;
    const label = numbers.slice(0, 3).join(',') + (numbers.length > 3 ? '…' : '');
    nodes[id] = { ...nodes[id], badge: label };
  }
  return { priority: 58, nodes, edges: {} };
}

// The two modules of a boundary crossing and what contains them, in orange.
export function buildCrossingOverlay(
  crossing: Crossing,
  ancestorsById: Record<string, string[]>,
): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const id of [crossing.from_id, crossing.to_id]) {
    for (const a of (ancestorsById[id] ?? [id]).filter(visible)) nodes[a] = { color: CROSSING };
  }
  return { priority: 57, nodes, edges: {} };
}

export interface WaterfallRow {
  step: TraceStep;
  depth: number;
  offsetPct: number;
  widthPct: number;
}

// Steps in time order, indented under their parent span, with bars relative to the whole trace.
export function waterfall(steps: TraceStep[]): WaterfallRow[] {
  if (steps.length === 0) return [];
  const bySpan = new Map(steps.map((s) => [s.span_id, s]));
  const depthOf = (s: TraceStep): number => {
    let depth = 0;
    let parent = s.parent_span_id ? bySpan.get(s.parent_span_id) : undefined;
    const seen = new Set<string>();
    while (parent && !seen.has(parent.span_id)) {
      seen.add(parent.span_id);
      depth++;
      parent = parent.parent_span_id ? bySpan.get(parent.parent_span_id) : undefined;
    }
    return depth;
  };
  const start = Math.min(...steps.map((s) => s.start_ns));
  const end = Math.max(...steps.map((s) => s.start_ns + s.duration_ns));
  const total = Math.max(1, end - start);
  return [...steps]
    .sort((a, b) => a.start_ns - b.start_ns)
    .map((step) => ({
      step,
      depth: depthOf(step),
      offsetPct: ((step.start_ns - start) / total) * 100,
      widthPct: Math.max(0.5, (step.duration_ns / total) * 100),
    }));
}
