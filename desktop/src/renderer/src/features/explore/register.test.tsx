import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import register from './register';

describe('explore feature', () => {
  it('registers focus, clear focus, the level indicator and the view state keeper', () => {
    const r = createRegistry();
    register(r);
    expect(r.nodeActions(gnode('module:a.py', 'module')).map((a) => a.id)).toEqual(['focus']);
    expect(r.commands()[0]).toMatchObject({ id: 'explore.clearFocus', shortcut: 'Shift+Escape' });
    expect(r.statusItems().map((s) => s.id)).toEqual(['level']);
    expect(r.globals().map((g) => g.id)).toEqual(['view-state-keeper']);
  });
});
