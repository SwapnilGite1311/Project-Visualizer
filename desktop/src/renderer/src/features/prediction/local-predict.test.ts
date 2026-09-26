// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { gatherLocalInputs, predictLocal } from './local-predict';

const base = { error_rate: 0, complexity: 0, stalls: 0, fan_in: 0 };

describe('local failure predictor', () => {
  it('uses the same formula and factor names as the Python heuristic', () => {
    const [p] = predictLocal([{ node_id: 'f', error_rate: 0.5, complexity: 15, stalls: 2, fan_in: 10 }]);
    // 0.6*0.5 + 0.02*0.5 + 0.1 + 0.05*0.5
    expect(p.probability).toBeCloseTo(0.435, 6);
    expect(p.top_factors).toEqual(['recent errors', 'high complexity', 'stalls', 'many callers']);
  });

  it('tops out at 0.77 (all factors), lists only the factors that count and sorts by probability', () => {
    const out = predictLocal([
      { ...base, node_id: 'quiet' },
      { ...base, node_id: 'broken', error_rate: 1, stalls: 3, complexity: 90, fan_in: 99 },
      { ...base, node_id: 'complex', complexity: 60 },
    ]);
    expect(out.map((p) => p.node_id)).toEqual(['broken', 'complex', 'quiet']);
    expect(out[0].probability).toBe(0.77);
    expect(out[1]).toEqual({ node_id: 'complex', probability: 0.02, top_factors: ['high complexity'] });
    expect(out[2].top_factors).toEqual([]);
  });

  describe('gathering inputs', () => {
    let fake: FakeBridge;
    beforeEach(() => {
      fake = installFakeBridge();
      fake.rpcHandlers.set('analysis.hotspots', () => ({
        hotspots: [
          { node_id: 'f', kind: 'function', name: 'f', file_path: 'a.py', score: 1, reasons: [], metrics: { loc: 1, complexity: 12, fan_in: 4, fan_out: 0 } },
          { node_id: 'g', kind: 'function', name: 'g', file_path: 'a.py', score: 1, reasons: [], metrics: { loc: 1, complexity: 1, fan_in: 0, fan_out: 0 } },
        ],
      }));
    });

    it('reads the last hour of calls, errors and stalls per hotspot', async () => {
      const seen: Array<Record<string, unknown>> = [];
      fake.rpcHandlers.set('metrics.series', (p) => {
        const q = p as { node_id: string; metric: string };
        seen.push(p as Record<string, unknown>);
        if (q.node_id !== 'f') return { points: [] };
        const v = { calls: [30, 10], errors: [2, 2], stalls: [0, 1] }[q.metric] ?? [];
        return { points: v.map((x, i) => ({ t: i, v: x })) };
      });
      const inputs = await gatherLocalInputs('p1', 10_000_000);
      expect(inputs).toEqual([
        { node_id: 'f', error_rate: 0.1, complexity: 12, stalls: 1, fan_in: 4 },
        { node_id: 'g', error_rate: 0, complexity: 1, stalls: 0, fan_in: 0 },
      ]);
      expect(seen[0]).toMatchObject({ project_id: 'p1', from_ms: 10_000_000 - 3_600_000, to_ms: 10_000_000 });
    });

    it('keeps the static part when the history cannot be read', async () => {
      fake.rpcHandlers.set('metrics.series', () => {
        throw new Error('no metrics');
      });
      const inputs = await gatherLocalInputs('p1');
      expect(inputs[0]).toEqual({ node_id: 'f', error_rate: 0, complexity: 12, stalls: 0, fan_in: 4 });
    });
  });
});
