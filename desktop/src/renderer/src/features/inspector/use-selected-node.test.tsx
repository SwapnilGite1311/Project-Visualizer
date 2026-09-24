// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { useSelectedNode } from './use-selected-node';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));
const mocked = vi.mocked(getNode);

beforeEach(() => {
  mocked.mockReset();
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
});

describe('useSelectedNode', () => {
  it('is null without a selection and loads the selected node', async () => {
    mocked.mockImplementation(async (_p, id) => gnode(id, 'class'));
    const { result } = renderHook(() => useSelectedNode());
    expect(result.current.node).toBeNull();
    act(() => useAppStore.getState().select('class:a.py#A'));
    await waitFor(() => expect(result.current.node?.id).toBe('class:a.py#A'));
  });

  it('ignores stale responses', async () => {
    let resolveOld: (n: GraphNode) => void = () => undefined;
    mocked
      .mockImplementationOnce(() => new Promise<GraphNode>((r) => (resolveOld = r)))
      .mockImplementationOnce(async () => gnode('new', 'class'));
    const { result } = renderHook(() => useSelectedNode());
    act(() => useAppStore.getState().select('old'));
    act(() => useAppStore.getState().select('new'));
    await waitFor(() => expect(result.current.node?.id).toBe('new'));
    await act(async () => resolveOld(gnode('old', 'class')));
    expect(result.current.node?.id).toBe('new');
  });
});
