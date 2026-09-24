// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevelView } from '../api/engine';
import type { LevelView } from '../api/types';
import { useAppStore } from '../core/store';
import { gnode, levelView } from './test-data';
import { useLevelView } from './use-level-view';

vi.mock('../api/engine', () => ({ getLevelView: vi.fn() }));
const mocked = vi.mocked(getLevelView);

beforeEach(() => {
  mocked.mockReset();
  useAppStore.setState(useAppStore.getInitialState());
});

describe('useLevelView', () => {
  it('returns null without a project', () => {
    const { result } = renderHook(() => useLevelView());
    expect(result.current.view).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });

  it('loads on mount and when the parent changes', async () => {
    mocked.mockImplementation(async (_pid, parent) => levelView([gnode(`${parent}/child`, 'module')]));
    act(() => useAppStore.getState().openedProject('p1', 'C:/x'));
    const { result } = renderHook(() => useLevelView());
    await waitFor(() => expect(result.current.view?.nodes[0].id).toBe('project:/child'));
    act(() => useAppStore.getState().setParent('package:app'));
    await waitFor(() => expect(result.current.view?.nodes[0].id).toBe('package:app/child'));
    expect(mocked).toHaveBeenLastCalledWith('p1', 'package:app');
  });

  it('ignores a stale response', async () => {
    let resolveSlow: (v: LevelView) => void = () => undefined;
    mocked
      .mockImplementationOnce(() => new Promise<LevelView>((r) => (resolveSlow = r)))
      .mockImplementationOnce(async () => levelView([gnode('fresh', 'module')]));
    act(() => useAppStore.getState().openedProject('p1', 'C:/x'));
    const { result } = renderHook(() => useLevelView());
    act(() => useAppStore.getState().setParent('package:app'));
    await waitFor(() => expect(result.current.view?.nodes[0].id).toBe('fresh'));
    await act(async () => resolveSlow(levelView([gnode('stale', 'module')])));
    expect(result.current.view?.nodes[0].id).toBe('fresh');
  });

  it('reports errors', async () => {
    mocked.mockRejectedValue(new Error('engine not running'));
    act(() => useAppStore.getState().openedProject('p1', 'C:/x'));
    const { result } = renderHook(() => useLevelView());
    await waitFor(() => expect(result.current.error).toBe('engine not running'));
  });
});
