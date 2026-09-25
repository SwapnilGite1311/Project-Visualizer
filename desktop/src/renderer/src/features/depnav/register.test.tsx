import { describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import { useDepnavStore } from './depnav-store';
import { usePathDialog } from './path-dialog-store';
import register from './register';

vi.mock('./deps-api', () => ({ neighbors: vi.fn(), findPath: vi.fn(), cycles: vi.fn() }));
vi.mock('../../api/engine', () => ({ getAncestors: vi.fn(async () => []) }));

describe('depnav feature', () => {
  it('registers node actions, the panel, the command and the dialog host', () => {
    const r = createRegistry();
    register(r);
    const fn = gnode('function:a.py#f', 'function');
    expect(r.nodeActions(fn).map((a) => a.id)).toEqual(['deps', 'deps-path']);
    expect(r.nodeActions(gnode('project:', 'project'))).toEqual([]);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['dependencies']);
    expect(r.commands().map((c) => c.id)).toEqual(['deps.clear']);
    expect(r.globals().map((g) => g.id)).toEqual(['path-dialog']);
    void r.nodeActions(fn)[1].run(fn);
    expect(useDepnavStore.getState().root?.id).toBe('function:a.py#f');
    expect(usePathDialog.getState().open).toBe(true);
  });
});
