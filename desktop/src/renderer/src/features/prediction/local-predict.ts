import { rpc } from '../../api/bridge';
import { hotspots } from '../../api/engine';

// Failure predictions computed on this computer (no cloud, no trained model). The formula and the factor names are
// the Python heuristic (P5-MLFAIL `heuristic_terms`), so both paths explain themselves the same way.

export interface LocalInput {
  node_id: string;
  error_rate: number; // errors / calls over the last hour
  complexity: number;
  stalls: number; // stalls over the last hour
  fan_in: number;
}

export interface FailurePrediction {
  node_id: string;
  probability: number;
  top_factors: string[];
}

const HOUR = 3_600_000;
const CANDIDATES = 50;

export function heuristicTerms(i: LocalInput): Array<[string, number]> {
  return [
    ['recent errors', 0.6 * i.error_rate],
    ['high complexity', 0.02 * Math.min(1, i.complexity / 30)],
    ['stalls', i.stalls > 0 ? 0.1 : 0],
    ['many callers', 0.05 * Math.min(1, i.fan_in / 20)],
  ];
}

export function predictLocal(inputs: LocalInput[]): FailurePrediction[] {
  return inputs
    .map((i) => {
      const terms = heuristicTerms(i);
      const sum = terms.reduce((s, [, v]) => s + v, 0);
      return {
        node_id: i.node_id,
        probability: Math.round(Math.min(0.95, sum) * 10_000) / 10_000,
        top_factors: terms.filter(([, v]) => v > 0).map(([name]) => name),
      };
    })
    .sort((a, b) => b.probability - a.probability || (a.node_id < b.node_id ? -1 : 1));
}

async function seriesSum(projectId: string, nodeId: string, metric: string, fromMs: number, toMs: number): Promise<number> {
  const r = await rpc<{ points: Array<{ t: number; v: number }> }>('metrics.series', {
    project_id: projectId,
    node_id: nodeId,
    metric,
    from_ms: fromMs,
    to_ms: toMs,
    bucket_ms: HOUR,
  });
  return r.points.reduce((s, p) => s + p.v, 0);
}

// The candidates are the project's hotspots; runtime numbers come from the metrics history of the last hour.
// A node without history still gets its static part (complexity, callers).
export async function gatherLocalInputs(projectId: string, now = Date.now()): Promise<LocalInput[]> {
  const candidates = await hotspots(projectId, CANDIDATES);
  const from = now - HOUR;
  return Promise.all(
    candidates.map(async (h) => {
      const [calls, errors, stalls] = await Promise.all(
        ['calls', 'errors', 'stalls'].map((m) => seriesSum(projectId, h.node_id, m, from, now).catch(() => 0)),
      );
      return {
        node_id: h.node_id,
        error_rate: calls > 0 ? Math.min(1, errors / calls) : 0,
        complexity: h.metrics.complexity,
        stalls,
        fan_in: h.metrics.fan_in,
      };
    }),
  );
}
