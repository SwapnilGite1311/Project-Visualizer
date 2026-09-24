import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import register from './register';

describe('explain feature', () => {
  it('registers the action, panel and command', () => {
    const r = createRegistry();
    register(r);
    expect(r.nodeActions(gnode('project:', 'project')).map((a) => a.id)).toEqual(['explain']);
    expect(r.panels('right').map((p) => p.id)).toEqual(['explanation']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([['explain.selected', 'Ctrl+E']]);
  });
});
