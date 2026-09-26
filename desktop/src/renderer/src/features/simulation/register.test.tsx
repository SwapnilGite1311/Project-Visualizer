import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('simulation feature', () => {
  it('registers actions, the panel, globals and commands', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom')).toEqual([expect.objectContaining({ id: 'simulation', title: 'Simulation', order: 55 })]);
    expect(r.globals().map((g) => g.id)).toEqual(['sandbox-banner', 'sim-dialogs', 'sim-flows-watcher']);
    expect(r.commands().map((c) => c.id).sort()).toEqual(['sim.exit', 'sim.run', 'sim.start']);
  });
});
