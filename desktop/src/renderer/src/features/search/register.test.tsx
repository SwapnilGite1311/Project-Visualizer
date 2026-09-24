import { describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import register from './register';
import { searchBus } from './search-bus';

describe('search feature', () => {
  it('adds the panel and the Ctrl+F command', async () => {
    vi.useFakeTimers();
    const r = createRegistry();
    register(r);
    expect(r.panels('left').map((p) => p.id)).toEqual(['search']);
    const cmd = r.commands().find((c) => c.id === 'search.focus');
    expect(cmd?.shortcut).toBe('Ctrl+F');
    const focus = vi.fn();
    searchBus.focus = focus;
    await cmd?.run();
    expect(useAppStore.getState().activePanel.left).toBe('search');
    vi.runAllTimers();
    expect(focus).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
