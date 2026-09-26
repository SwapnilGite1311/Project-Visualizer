// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import { buildSimOverlay, useSimStore } from './sim-store';
import { fakeSimEngine, RESULT } from './sim-test-data';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fakeSimEngine(fake);
  useAppStore.setState(useAppStore.getInitialState());
  useSimStore.setState(useSimStore.getInitialState());
  useRecommendInputs.getState().reset();
  useAppStore.getState().openedProject('base', 'C:/code/app');
});

describe('simulation store', () => {
  it('opens a sandbox and shows its map', async () => {
    await useSimStore.getState().start('no validation');
    expect(fake.rpcCalls[0]).toEqual({ method: 'sim.create', params: { project_id: 'base', label: 'no validation' } });
    expect(useAppStore.getState().projectId).toBe('view1');
    expect(useAppStore.getState().projectRoot).toBe('sim:no validation');
    expect(useSimStore.getState().active).toMatchObject({ sandbox_id: 's1', base_project_id: 'base', base_root: 'C:/code/app' });
  });

  it('applies changes, runs, feeds the decision and draws the differences', async () => {
    await useSimStore.getState().start();
    const version = useAppStore.getState().graphVersion;
    await useSimStore.getState().apply({ kind: 'delete_node', node_id: 'function:app/utils.py#is_valid' });
    expect(useAppStore.getState().graphVersion).toBe(version + 1);
    await useSimStore.getState().run();
    expect(useRecommendInputs.getState().simulation).toEqual(RESULT);
    const overlay = useAppStore.getState().overlays.sim;
    expect(overlay.priority).toBe(62);
    expect(overlay.nodes['function:app/utils.py#is_valid']).toMatchObject({ badge: 'removed', opacity: 0.3 });
    expect(overlay.nodes['method:app/services.py#UserService.get_user']).toMatchObject({ color: '#ef4444', pulse: true });
    expect(overlay.edges['agg|calls|module:app/services.py|module:app/utils.py']).toEqual({ animated: true, color: '#ef4444' });
  });

  it('exits to the real project and discards the sandbox', async () => {
    await useSimStore.getState().start();
    useSimStore.getState().exit();
    expect(useAppStore.getState().projectId).toBe('base');
    expect(useAppStore.getState().overlays.sim).toBeUndefined();
    useSimStore.getState().enter();
    expect(useAppStore.getState().projectId).toBe('view1');
    await useSimStore.getState().discard();
    expect(useAppStore.getState().projectId).toBe('base');
    expect(useSimStore.getState().active).toBeNull();
    expect(fake.rpcCalls.some((c) => c.method === 'sim.discard')).toBe(true);
  });

  it('does not open a sandbox inside a sandbox', async () => {
    useAppStore.getState().openedProject('view1', 'sim:x');
    await useSimStore.getState().start();
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it('marks latency and error changes', () => {
    const o = buildSimOverlay(
      [
        { kind: 'set_latency', node_id: 'a', factor: 5 },
        { kind: 'set_error_rate', node_id: 'b', rate: 0.5 },
      ],
      null,
      [],
    );
    expect(o.nodes.a).toEqual({ color: '#f97316', badge: 'x5' });
    expect(o.nodes.b).toEqual({ color: '#ef4444', badge: '50% fail' });
  });
});
