import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { SAVE_DELAY_MS, startViewStateKeeper } from './view-state';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));
vi.mock('../../api/main', () => ({ getSetting: vi.fn(), setSetting: vi.fn(async () => true) }));

let stop: () => void = () => undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  useAppStore.getState().closedProject();
  vi.mocked(getNode).mockResolvedValue(gnode('package:app', 'package'));
  vi.mocked(getSetting).mockResolvedValue(null);
  stop = startViewStateKeeper();
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});

describe('view state keeper', () => {
  it('restores the saved level and selection when a project opens', async () => {
    vi.mocked(getSetting).mockResolvedValue({ parentId: 'package:app', selectedId: 'module:app/x.py' });
    useAppStore.getState().openedProject('p1', 'C:/code/app');
    await vi.advanceTimersByTimeAsync(0);
    expect(getSetting).toHaveBeenCalledWith('project.viewState.C:/code/app', null);
    expect(getNode).toHaveBeenCalledWith('p1', 'package:app');
    expect(useAppStore.getState().currentParentId).toBe('package:app');
    expect(useAppStore.getState().selectedNodeId).toBe('module:app/x.py');
  });

  it('skips a saved level that no longer exists', async () => {
    vi.mocked(getSetting).mockResolvedValue({ parentId: 'package:gone', selectedId: null });
    vi.mocked(getNode).mockRejectedValue(new Error('node not found'));
    useAppStore.getState().openedProject('p1', 'C:/code/app');
    await vi.advanceTimersByTimeAsync(0);
    expect(useAppStore.getState().currentParentId).toBe('project:');
  });

  it('saves 500 ms after the last change', async () => {
    useAppStore.getState().openedProject('p1', 'C:/code/app');
    await vi.advanceTimersByTimeAsync(0);
    useAppStore.getState().setParent('package:app');
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS - 100);
    useAppStore.getState().select('module:app/x.py');
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS - 100);
    expect(setSetting).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(setSetting).toHaveBeenCalledTimes(1);
    expect(setSetting).toHaveBeenCalledWith('project.viewState.C:/code/app', { parentId: 'package:app', selectedId: 'module:app/x.py' });
  });

  it('stops listening when stopped', async () => {
    stop();
    useAppStore.getState().openedProject('p1', 'C:/code/app');
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(getSetting).not.toHaveBeenCalled();
  });
});
