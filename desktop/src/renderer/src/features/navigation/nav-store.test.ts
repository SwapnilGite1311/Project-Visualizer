import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { goBack, goForward, goHome, goUp, startNavigationTracking } from './nav-store';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));

let stop: () => void = () => undefined;
beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
  stop = startNavigationTracking();
});
afterEach(() => stop());

const parent = () => useAppStore.getState().currentParentId;

describe('navigation store', () => {
  it('goes back and forward through visited levels', () => {
    useAppStore.getState().setParent('package:a');
    useAppStore.getState().setParent('package:a/b');
    goBack();
    expect(parent()).toBe('package:a');
    goBack();
    expect(parent()).toBe('project:');
    goForward();
    expect(parent()).toBe('package:a');
  });

  it('goes up using the parent of the current node', async () => {
    useAppStore.getState().setParent('module:a/b.py');
    vi.mocked(getNode).mockResolvedValue(gnode('module:a/b.py', 'module', 10, 'package:a'));
    await goUp();
    expect(parent()).toBe('package:a');
    goHome();
    expect(parent()).toBe('project:');
  });
});
