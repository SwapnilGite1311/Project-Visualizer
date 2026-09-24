import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, invoke } from '../../api/bridge';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { useExplainStore } from './explain-store';

vi.mock('../../api/bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bridge')>();
  return { ...actual, invoke: vi.fn() };
});
const mocked = vi.mocked(invoke);
const node = gnode('function:app/utils.py#is_valid', 'function');
const result = { node_id: node.id, markdown: '**Summary:** ok', cited_nodes: [], model: 'm' };

beforeEach(() => {
  mocked.mockReset();
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
  useExplainStore.getState().clearCache();
});

describe('useExplainStore', () => {
  it('caches results and re-requests when forced', async () => {
    mocked.mockResolvedValue(result);
    await useExplainStore.getState().explain(node);
    await useExplainStore.getState().explain(node);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith('pv:ai.explainNode', { project_id: 'p1', node_id: node.id });
    expect(useExplainStore.getState().results[node.id]).toEqual(result);
    expect(useAppStore.getState().activePanel.right).toBe('explanation');
    await useExplainStore.getState().explain(node, true);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('stores errors with their code', async () => {
    mocked.mockRejectedValue(new ApiError('no_api_key', 'Add an API key in Settings → AI'));
    await useExplainStore.getState().explain(node);
    expect(useExplainStore.getState().errors[node.id]).toEqual({ code: 'no_api_key', message: 'Add an API key in Settings → AI' });
    expect(useExplainStore.getState().loading[node.id]).toBe(false);
  });

  it('clears the cache when the project changes', async () => {
    mocked.mockResolvedValue(result);
    await useExplainStore.getState().explain(node);
    useAppStore.getState().openedProject('p2', 'C:/y');
    expect(useExplainStore.getState().results).toEqual({});
  });
});
