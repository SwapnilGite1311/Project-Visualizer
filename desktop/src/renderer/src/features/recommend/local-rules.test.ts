import { describe, expect, it } from 'vitest';
import { recommendLocal, type RecommendRequest } from './local-rules';

const replay = (over: Partial<NonNullable<RecommendRequest['simulation']>> = {}): NonNullable<RecommendRequest['simulation']> => ({
  mode: 'replay',
  traces_total: 100,
  traces_failed_real: 0,
  traces_failed_sim: 0,
  latency_p95_real_ms: 100,
  latency_p95_sim_ms: 100,
  failed_trace_ids: [],
  broken_node_ids: [],
  ...over,
});

// The same cases are written again for the Python rules (P5-MLREC) and must give the same answers.
describe('recommendLocal', () => {
  it('no signals: go with low confidence', () => {
    const r = recommendLocal({});
    expect(r.verdict).toBe('go');
    expect(r.confidence).toBe(0.2);
    expect(r.reasons).toEqual(['No preview, simulation or prediction yet.']);
  });

  it('a clean simulation: go', () => {
    const r = recommendLocal({ simulation: replay() });
    expect(r.verdict).toBe('go');
    expect(r.confidence).toBe(0.5); // 100 of 200 traces
    expect(r.reasons).toEqual(['No risk signal found in the data available.']);
  });

  it('critical preview risk: no-go', () => {
    const r = recommendLocal({ change_preview: { risk: { score: 92, level: 'critical' }, affected: [] } });
    expect(r.verdict).toBe('no_go');
    expect(r.confidence).toBe(0.8);
    expect(r.reasons[0]).toBe('The change preview rates the risk as critical (score 92/100).');
  });

  it('high preview risk: caution', () => {
    expect(recommendLocal({ change_preview: { risk: { score: 70, level: 'high' } } }).verdict).toBe('caution');
  });

  it('many new failures in the simulation: no-go; few: caution', () => {
    const many = recommendLocal({ simulation: replay({ traces_failed_sim: 5, failed_trace_ids: ['t9'] }) });
    expect(many.verdict).toBe('no_go');
    expect(many.reasons).toContain('The simulation fails 5 of 100 recorded requests that work today.');
    expect(many.actions[0]).toBe('Look at the failing requests (for example t9) before making this change.');
    expect(recommendLocal({ simulation: replay({ traces_failed_sim: 4 }) }).verdict).toBe('caution');
  });

  it('a much slower simulation: caution', () => {
    const r = recommendLocal({ simulation: replay({ latency_p95_sim_ms: 151 }) });
    expect(r.verdict).toBe('caution');
    expect(r.reasons).toEqual(['Simulated response time (p95) rises from 100 ms to 151 ms.']);
    expect(recommendLocal({ simulation: replay({ latency_p95_sim_ms: 150 }) }).verdict).toBe('go');
  });

  it('static simulation with dependents: caution with low confidence', () => {
    const r = recommendLocal({
      simulation: { mode: 'static', traces_total: 0, traces_failed_real: 0, traces_failed_sim: 0, latency_p95_real_ms: 0, latency_p95_sim_ms: 0, broken_node_ids: ['a', 'b'] },
    });
    expect(r.verdict).toBe('caution');
    expect(r.confidence).toBe(0.3);
    expect(r.reasons).toEqual(['Without runtime data, 2 parts depend on what you change.']);
  });

  it('predictions and forecasts only count for the parts the change touches', () => {
    const preview = { change: { node_id: 'function:a.py#f' }, affected: [{ node_id: 'function:b.py#g' }], risk: { score: 10, level: 'low' } };
    const predictions = { predictions: [{ node_id: 'function:b.py#g', probability: 0.8 }, { node_id: 'function:z.py#other', probability: 0.99 }], method: 'model' };
    const forecasts = { forecasts: [{ node_id: 'function:a.py#f', predicted_state: 'error', confidence: 0.5 }] };
    const r = recommendLocal({ change_preview: preview, failure_predictions: predictions, forecasts });
    expect(r.verdict).toBe('caution');
    expect(r.reasons).toEqual(['g already has a 80% chance of failing within the hour.', 'f is forecast to be failing soon.']);
    expect(r.actions).toEqual(['Fix current errors in g first.', 'Stabilise f before changing code that depends on it.']);
    expect(r.confidence).toBe(0.67); // (0.8 + 0.7 + 0.5) / 3
  });

  it('writes markdown with the verdict, reasons and actions', () => {
    const r = recommendLocal({ change_preview: { risk: { score: 92, level: 'critical' } } });
    expect(r.markdown.split('\n')[0]).toBe('**Verdict: No-go** (confidence 80%)');
    expect(r.markdown).toContain('- Split the change into smaller steps and check the impact again.');
  });
});
