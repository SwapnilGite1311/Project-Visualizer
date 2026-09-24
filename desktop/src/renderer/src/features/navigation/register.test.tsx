import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('navigation feature', () => {
  it('registers toolbar items, commands and the tracker', () => {
    const r = createRegistry();
    register(r);
    expect(r.toolbarItems('left').map((t) => t.id)).toEqual(['nav-buttons', 'breadcrumb']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([
      ['nav.back', 'Alt+ArrowLeft'],
      ['nav.forward', 'Alt+ArrowRight'],
      ['nav.home', 'Alt+Home'],
      ['nav.up', 'Alt+ArrowUp'],
    ]);
    expect(r.globals().map((g) => g.id)).toEqual(['nav-tracking']);
  });
});
