import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevelView } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gedge, gnode, levelView } from '../../view/test-data';
import { clearFocus, focusOn, levelName } from './explore-store';

vi.mock('../../api/engine', () => ({ getLevelView: vi.fn() }));

beforeEach(() => {
  vi.mocked(getLevelView).mockResolvedValue(
    levelView([gnode('module:a.py', 'module'), gnode('module:b.py', 'module')], [gedge('module:a.py', 'module:b.py', 'imports')]),
  );
  useAppStore.setState({ projectId: 'p1', currentParentId: 'package:app', overlays: {}, focusNodeId: null });
});

describe('explore store', () => {
  it('names levels', () => {
    expect([1, 2, 3, 4, 5, 6].map(levelName)).toEqual(['Packages', 'Modules', 'Classes', 'Functions', 'Statements', 'Elements']);
  });

  it('focuses on a node using the current level view', async () => {
    await focusOn('module:a.py');
    expect(getLevelView).toHaveBeenCalledWith('p1', 'package:app');
    const s = useAppStore.getState();
    expect(s.focusNodeId).toBe('module:a.py');
    expect(s.overlays.focus.nodes['module:b.py']).toEqual({ opacity: 1 });
  });

  it('clears focus explicitly and when the level changes', async () => {
    await focusOn('module:a.py');
    clearFocus();
    expect(useAppStore.getState().focusNodeId).toBeNull();
    expect(useAppStore.getState().overlays.focus).toBeUndefined();
    await focusOn('module:a.py');
    useAppStore.getState().setParent('module:a.py');
    expect(useAppStore.getState().focusNodeId).toBeNull();
    expect(useAppStore.getState().overlays.focus).toBeUndefined();
  });
});
