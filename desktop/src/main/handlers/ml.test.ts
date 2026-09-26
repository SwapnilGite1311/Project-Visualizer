import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { CloudClient } from '../cloud/cloud-client';
import type { MainContext } from '../core/context';
import { fakeContext } from '../core/test-context';
import register, { cloudClientFor } from './ml';

const CSV = 'node_id,kind,level,minute,loc,complexity,fan_in,fan_out,calls,errors,p95_ms,stalls\nf,function,4,100,1,1,0,0,5,1,2,0\n';

function setup(signedIn = true) {
  const engineCalls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const engine = {
    request: vi.fn(async (method: string, params: Record<string, unknown>) => {
      engineCalls.push({ method, params });
      writeFileSync(params.out_path as string, CSV);
      return { rows: 1 };
    }),
  };
  const request = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>(async () => ({ ok: true }));
  const client = { signedIn: () => signedIn, request } as unknown as CloudClient;
  const ctx = fakeContext({ engine: engine as unknown as MainContext['engine'] });
  register(ctx, client);
  return { ctx, request, engineCalls };
}

describe('ML handlers', () => {
  it('says whether the cloud is available', async () => {
    expect(await setup(true).ctx.call('pv:ml.available')).toBe(true);
    expect(await setup(false).ctx.call('pv:ml.available')).toBe(false);
  });

  it('sends the exported rows for training and predictions', async () => {
    const { ctx, request, engineCalls } = setup();
    await ctx.call('pv:ml.train', { project_id: 'p1', cloud_project_id: 'c 1' });
    expect(request).toHaveBeenLastCalledWith('POST', '/api/ml/projects/c%201/train', { rows: [expect.objectContaining({ node_id: 'f', errors: 1 })] });
    expect(engineCalls[0].params.from_ms).toBeUndefined();

    await ctx.call('pv:ml.predictFailures', { project_id: 'p1', cloud_project_id: 'c1' });
    expect(request.mock.calls.at(-1)?.[1]).toBe('/api/ml/projects/c1/predict/failures');
    const since = engineCalls[1].params.from_ms as number;
    expect(Date.now() - since).toBeGreaterThanOrEqual(2 * 3_600_000 - 1000);

    await ctx.call('pv:ml.predictBottlenecks', { project_id: 'p1', cloud_project_id: 'c1' });
    expect(request.mock.calls.at(-1)?.[1]).toBe('/api/ml/projects/c1/predict/bottlenecks');

    await ctx.call('pv:ml.job', { job_id: 'j1' });
    expect(request).toHaveBeenLastCalledWith('GET', '/api/ml/jobs/j1');
    await ctx.call('pv:ml.forecast', { series: [], horizon: 24, step_ms: 3_600_000 });
    expect(request).toHaveBeenLastCalledWith('POST', '/api/ml/forecast', { series: [], horizon: 24, step_ms: 3_600_000 });
    await ctx.call('pv:ml.recommend', { input: { simulation: null } });
    expect(request).toHaveBeenLastCalledWith('POST', '/api/ml/recommend', { simulation: null });
  });

  it('finds anomalies without the cloud', async () => {
    const { ctx, request } = setup(false);
    const values = Array.from({ length: 30 }, (_, i) => ({ t: i, v: i === 12 ? 50 : 1 }));
    const r = (await ctx.call('pv:ml.anomalies', { series: [{ node_id: 'n', metric: 'calls', points: values }] })) as {
      results: Array<{ anomalies: Array<{ t: number }> }>;
    };
    expect(r.results[0].anomalies.map((a) => a.t)).toEqual([12]);
    expect(request).not.toHaveBeenCalled();
  });

  it('builds the cloud client from the account settings and secrets', () => {
    const secrets = new Map<string, string>([
      ['cloud.accessToken', 'a'],
      ['cloud.refreshToken', 'r'],
    ]);
    const ctx = fakeContext({
      secrets: {
        get: (k: string) => secrets.get(k) ?? null,
        set: (k: string, v: string) => void secrets.set(k, v),
        delete: (k: string) => void secrets.delete(k),
        has: (k: string) => secrets.has(k),
      } as unknown as MainContext['secrets'],
    });
    expect(cloudClientFor(ctx).signedIn()).toBe(true);
    secrets.clear();
    expect(cloudClientFor(ctx).signedIn()).toBe(false);
  });
});
