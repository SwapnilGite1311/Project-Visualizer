// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rpc } from '../api/bridge';
import { getLevelView } from '../api/engine';
import type { LevelView } from '../api/types';
import { useAppStore } from '../core/store';
import { gnode, levelView } from './test-data';
import { useLevelView } from './use-level-view';

vi.mock('../api/engine', () => ({ getLevelView: vi.fn() }));
vi.mock('../api/bridge', () => ({ rpc: vi.fn() }));
const mocked = vi.mocked(getLevelView);
const mockedRpc = vi.mocked(rpc);

beforeEach(() => {
  mocked.mockReset();
  mockedRpc.mockReset();
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

  it('asks the engine for a layout only for engine-layout renderers', async () => {
    mocked.mockImplementation(async () => levelView([gnode('module:a.py', 'module')]));
    mockedRpc.mockResolvedValue({ graph_version: 7, cached: false, positions: { 'module:a.py': { x: 1, y: 2 } }, edges: {} });
    act(() => useAppStore.getState().openedProject('p1', 'C:/x'));
    const plain = renderHook(() => useLevelView());
    await waitFor(() => expect(plain.result.current.view).not.toBeNull());
    expect(mockedRpc).not.toHaveBeenCalled();
    expect(plain.result.current.layout).toBeNull();

    const withLayout = renderHook(() => useLevelView('2d'));
    await waitFor(() => expect(withLayout.result.current.layout?.graph_version).toBe(7));
    expect(mockedRpc).toHaveBeenCalledWith('layout.compute', { project_id: 'p1', parent_id: 'project:', mode: '2d' });
  });

  it('keeps the level when the layout fails', async () => {
    mocked.mockImplementation(async () => levelView([gnode('module:a.py', 'module')]));
    mockedRpc.mockRejectedValue(new Error('method not found'));
    act(() => useAppStore.getState().openedProject('p1', 'C:/x'));
    const { result } = renderHook(() => useLevelView('3d'));
    await waitFor(() => expect(result.current.view?.nodes).toHaveLength(1));
    expect(result.current.layout).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
