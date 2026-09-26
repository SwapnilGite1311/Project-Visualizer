import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('time travel feature', () => {
  it('adds the History panel, the banner and the shortcut', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom')).toEqual([expect.objectContaining({ id: 'history', title: 'History', order: 50 })]);
    expect(r.globals().map((g) => g.id)).toEqual(['history-banner']);
    expect(r.commands()).toEqual([expect.objectContaining({ id: 'history.open', shortcut: 'Ctrl+Shift+H' })]);
  });
});
