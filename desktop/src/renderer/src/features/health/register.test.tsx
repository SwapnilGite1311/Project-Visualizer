// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { useHealthStore } from './health-store';
import register from './register';

const revealRootCause = vi.fn<(id: string) => Promise<void>>(async () => undefined);
vi.mock('./HealthPanel', () => ({
  HealthPanel: () => null,
  revealRootCause: (id: string) => revealRootCause(id),
}));

beforeEach(() => {
  revealRootCause.mockClear();
  useHealthStore.setState({ states: {} });
});

describe('health feature', () => {
  it('registers the panel, node action, command and watcher', async () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('right').map((p) => p.id)).toEqual(['health']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([
      ['health.rootCause', 'Ctrl+Shift+K'],
    ]);
    expect(r.globals().map((g) => g.id)).toEqual(['health-watcher']);

    const healthy = gnode('module:a.py', 'module');
    const failing = { ...gnode('module:b.py', 'module'), health: 'error' as const };
    expect(r.nodeActions(healthy).map((a) => a.id)).toEqual([]);
    expect(r.nodeActions(failing).map((a) => a.id)).toEqual(['root-cause']);
    useHealthStore.setState({
      states: {
        'module:a.py': {
          state: 'stalled',
          calls: 1,
          errors: 0,
          error_rate: 0,
          p95_ms: 0,
          stalled: true,
          reason: '',
        },
      },
    });
    expect(r.nodeActions(healthy).map((a) => a.id)).toEqual(['root-cause']);

    await r.nodeActions(failing)[0].run(failing);
    expect(revealRootCause).toHaveBeenCalledWith('module:b.py');
    useAppStore.setState({ selectedNodeId: 'module:c.py' });
    await r.commands()[0].run();
    expect(revealRootCause).toHaveBeenLastCalledWith('module:c.py');
  });
});
