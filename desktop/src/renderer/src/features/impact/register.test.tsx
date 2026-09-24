import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import register from './register';

describe('impact feature', () => {
  it('registers the action, panel and clear command', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['impact']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([['impact.clear', 'Escape']]);
    expect(r.nodeActions(gnode('function:a.py#f', 'function')).map((a) => a.id)).toEqual(['impact']);
    expect(r.nodeActions(gnode('project:', 'project'))).toEqual([]);
    expect(r.nodeActions(gnode('external:os', 'external'))).toEqual([]);
  });
});
