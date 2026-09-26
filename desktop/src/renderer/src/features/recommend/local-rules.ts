// The decision recommendation, computed on this computer (works offline). The Python engine (P5-MLREC) uses the same
// thresholds, confidence math and texts, so the verdict does not change when the cloud explains it.

export type Verdict = 'go' | 'caution' | 'no_go';

export interface RecommendRequest {
  change_preview?: {
    change?: { node_id?: string };
    affected?: Array<{ node_id: string }>;
    risk?: { score?: number; level?: string };
  } | null;
  simulation?: {
    mode: 'replay' | 'static';
    traces_total: number;
    traces_failed_real: number;
    traces_failed_sim: number;
    latency_p95_real_ms: number;
    latency_p95_sim_ms: number;
    failed_trace_ids?: string[];
    broken_node_ids?: string[];
  } | null;
  failure_predictions?: { predictions: Array<{ node_id: string; probability: number }>; method?: string } | null;
  forecasts?: { forecasts: Array<{ node_id: string; predicted_state: string; confidence: number }> } | null;
  notes?: string;
}

export interface RecommendResponse {
  verdict: Verdict;
  confidence: number;
  reasons: string[];
  actions: string[];
  markdown: string;
}

const RANK: Record<Verdict, number> = { go: 0, caution: 1, no_go: 2 };
const TITLE: Record<Verdict, string> = { go: 'Go', caution: 'Caution', no_go: 'No-go' };

// Thresholds (keep equal to the Python rules).
export const RULES = {
  noGoFailureShare: 0.05, // extra failing requests / all replayed requests
  slowdownFactor: 1.5, // simulated p95 / real p95
  failureProbability: 0.5,
  replayTracesForFullConfidence: 200,
};

export function nameOf(id: string): string {
  const hash = id.indexOf('#');
  if (hash >= 0) return id.slice(hash + 1);
  const colon = id.indexOf(':');
  return colon >= 0 ? id.slice(colon + 1) || id : id;
}

const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function recommendLocal(req: RecommendRequest): RecommendResponse {
  let verdict: Verdict = 'go';
  const reasons: string[] = [];
  const actions: string[] = [];
  const raise = (v: Verdict) => {
    if (RANK[v] > RANK[verdict]) verdict = v;
  };
  const addAction = (a: string) => {
    if (!actions.includes(a)) actions.push(a);
  };

  const preview = req.change_preview ?? null;
  const sim = req.simulation ?? null;
  const predictions = req.failure_predictions ?? null;
  const forecasts = req.forecasts ?? null;

  // 1. Change preview risk.
  const level = preview?.risk?.level;
  const score = preview?.risk?.score ?? 0;
  if (level === 'critical') {
    raise('no_go');
    reasons.push(`The change preview rates the risk as critical (score ${score}/100).`);
    addAction('Split the change into smaller steps and check the impact again.');
  } else if (level === 'high') {
    raise('caution');
    reasons.push(`The change preview rates the risk as high (score ${score}/100).`);
    addAction('Add or run tests for the directly affected parts before merging.');
  }

  // 2. Simulation.
  if (sim) {
    const extra = sim.traces_failed_sim - sim.traces_failed_real;
    if (sim.mode === 'replay' && extra > 0) {
      const share = extra / Math.max(1, sim.traces_total);
      raise(share >= RULES.noGoFailureShare ? 'no_go' : 'caution');
      reasons.push(`The simulation fails ${extra} of ${sim.traces_total} recorded requests that work today.`);
      const first = sim.failed_trace_ids?.[0];
      addAction(first ? `Look at the failing requests (for example ${first}) before making this change.` : 'Look at the failing requests before making this change.');
    }
    if (sim.mode === 'static' && (sim.broken_node_ids?.length ?? 0) > 0) {
      raise('caution');
      reasons.push(`Without runtime data, ${sim.broken_node_ids!.length} parts depend on what you change.`);
      addAction('Connect an agent and run the simulation on real requests.');
    }
    if (sim.mode === 'replay' && sim.latency_p95_real_ms > 0 && sim.latency_p95_sim_ms > sim.latency_p95_real_ms * RULES.slowdownFactor) {
      raise('caution');
      reasons.push(`Simulated response time (p95) rises from ${round(sim.latency_p95_real_ms)} ms to ${round(sim.latency_p95_sim_ms)} ms.`);
      addAction('Check the slowed-down calls for caching or batching options.');
    }
  }

  // The parts the change touches; without a preview every predicted part counts.
  const touched = new Set<string>([...(preview?.affected ?? []).map((a) => a.node_id), ...(preview?.change?.node_id ? [preview.change.node_id] : [])]);
  const concerns = (id: string) => touched.size === 0 || touched.has(id);

  // 3. Failure predictions.
  for (const p of predictions?.predictions ?? []) {
    if (!concerns(p.node_id) || p.probability <= RULES.failureProbability) continue;
    raise('caution');
    reasons.push(`${nameOf(p.node_id)} already has a ${Math.round(p.probability * 100)}% chance of failing within the hour.`);
    addAction(`Fix current errors in ${nameOf(p.node_id)} first.`);
  }

  // 4. Forecasts.
  for (const f of forecasts?.forecasts ?? []) {
    if (!concerns(f.node_id) || f.predicted_state !== 'error') continue;
    raise('caution');
    reasons.push(`${nameOf(f.node_id)} is forecast to be failing soon.`);
    addAction(`Stabilise ${nameOf(f.node_id)} before changing code that depends on it.`);
  }

  // Confidence: the mean quality of the signals that are present.
  const quality: number[] = [];
  if (preview) quality.push(0.8);
  if (sim) quality.push(sim.mode === 'replay' ? Math.min(1, sim.traces_total / RULES.replayTracesForFullConfidence) : 0.3);
  if (predictions) quality.push(predictions.method === 'model' ? 0.7 : 0.4);
  if (forecasts && forecasts.forecasts.length > 0) {
    quality.push(forecasts.forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.forecasts.length);
  }
  const confidence = round(Math.min(1, Math.max(0, quality.length ? quality.reduce((a, b) => a + b, 0) / quality.length : 0.2)), 2);

  if (reasons.length === 0) {
    if (quality.length === 0) {
      reasons.push('No preview, simulation or prediction yet.');
      addAction('Preview the change or run a simulation first.');
    } else {
      reasons.push('No risk signal found in the data available.');
      addAction('Go ahead; keep an eye on the live map after the change.');
    }
  }

  const markdown = [
    `**Verdict: ${TITLE[verdict]}** (confidence ${Math.round(confidence * 100)}%)`,
    '',
    '**Why**',
    ...reasons.map((r) => `- ${r}`),
    '',
    '**What to do**',
    ...actions.map((a) => `- ${a}`),
  ].join('\n');
  return { verdict, confidence, reasons, actions, markdown };
}
