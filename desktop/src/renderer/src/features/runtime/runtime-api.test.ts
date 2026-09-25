// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import {
  boundaries,
  clearRuntime,
  follow,
  getTrace,
  hubInfo,
  liveLevelView,
  recentTraces,
  regenerateToken,
  runtimeStatus,
  setActiveProject,
} from './runtime-api';

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  for (const m of ['runtime.status', 'runtime.clear', 'runtime.trace', 'rtsync.level_view'])
    fake.rpcHandlers.set(m, () => ({}));
  fake.rpcHandlers.set('runtime.recent_traces', () => ({ traces: [{ trace_id: 't1' }] }));
  fake.rpcHandlers.set('modtrace.boundaries', () => ({ crossings: [{ from_id: 'a' }] }));
  fake.rpcHandlers.set('modtrace.follow', () => ({ hops: [{ from_id: 'b' }] }));
  fake.invokeHandlers.set('pv:runtime.hubInfo', () => ({ url: 'http://127.0.0.1:47100' }));
  fake.invokeHandlers.set('pv:runtime.setActiveProject', () => ({ ok: true }));
  fake.invokeHandlers.set('pv:runtime.regenerateToken', () => ({ token: 'new' }));
});

describe('runtime api', () => {
  it('calls the engine methods', async () => {
    await runtimeStatus('p1');
    await clearRuntime('p1');
    await getTrace('p1', 't1');
    expect(await recentTraces('p1')).toEqual([{ trace_id: 't1' }]);
    await recentTraces('p1', 20);
    await liveLevelView('p1', 'project:');
    await liveLevelView('p1', 'package:app', 5000);
    expect(await boundaries('p1', 300000)).toEqual([{ from_id: 'a' }]);
    expect(await follow('p1', 't1', 'forward')).toEqual([{ from_id: 'b' }]);
    await follow('p1', 't1', 'backward', 'module:a.py');
    expect(fake.rpcCalls).toEqual([
      { method: 'runtime.status', params: { project_id: 'p1' } },
      { method: 'runtime.clear', params: { project_id: 'p1' } },
      { method: 'runtime.trace', params: { project_id: 'p1', trace_id: 't1' } },
      { method: 'runtime.recent_traces', params: { project_id: 'p1' } },
      { method: 'runtime.recent_traces', params: { project_id: 'p1', limit: 20 } },
      { method: 'rtsync.level_view', params: { project_id: 'p1', parent_id: 'project:' } },
      {
        method: 'rtsync.level_view',
        params: { project_id: 'p1', parent_id: 'package:app', window_ms: 5000 },
      },
      { method: 'modtrace.boundaries', params: { project_id: 'p1', window_ms: 300000 } },
      {
        method: 'modtrace.follow',
        params: { project_id: 'p1', trace_id: 't1', direction: 'forward' },
      },
      {
        method: 'modtrace.follow',
        params: {
          project_id: 'p1',
          trace_id: 't1',
          direction: 'backward',
          from_node_id: 'module:a.py',
        },
      },
    ]);
  });

  it('calls the hub channels', async () => {
    expect((await hubInfo()).url).toBe('http://127.0.0.1:47100');
    await setActiveProject('p1', 'C:/code/app');
    await setActiveProject(null, null);
    expect(await regenerateToken()).toBe('new');
    expect(fake.invokeCalls).toEqual([
      { channel: 'pv:runtime.hubInfo', payload: undefined },
      {
        channel: 'pv:runtime.setActiveProject',
        payload: { project_id: 'p1', root: 'C:/code/app' },
      },
      { channel: 'pv:runtime.setActiveProject', payload: { project_id: null, root: null } },
      { channel: 'pv:runtime.regenerateToken', payload: undefined },
    ]);
  });
});
