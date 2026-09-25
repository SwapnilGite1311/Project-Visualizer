import { describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import register from './register';

vi.mock('../../api/main', () => ({ getSetting: vi.fn(), setSetting: vi.fn() }));

describe('components feature', () => {
  it('registers actions, the pinned panel and the globals', () => {
    const r = createRegistry();
    register(r);
    const fn = { ...gnode('function:a.py#f', 'function'), file_path: 'a.py' };
    expect(r.nodeActions(fn).map((a) => a.id)).toEqual(['pin', 'copy-name', 'copy-id', 'copy-path', 'show-in-folder']);
    expect(r.panels('left').map((p) => [p.id, p.order])).toEqual([['pinned', 30]]);
    expect(r.globals().map((g) => g.id).sort()).toEqual(['component-states', 'hover-card']);
  });
});
