import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { search, suggest } from '../../api/engine';
import type { SearchHit } from '../../api/types';
import { useAppStore } from '../../core/store';
import { DEBOUNCE_MS, useSearchStore } from './search-store';

vi.mock('../../api/engine', () => ({ search: vi.fn(), suggest: vi.fn() }));

const hit = (name: string): SearchHit => ({
  node_id: 'function:app/x.py::' + name,
  name,
  kind: 'function',
  file_path: 'app/x.py',
  qualified_name: 'app.x.' + name,
  score: 60,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(search).mockReset();
  vi.mocked(suggest).mockReset().mockResolvedValue(['get_user']);
  useAppStore.setState({ projectId: 'p1' });
  useSearchStore.getState().clear();
  useSearchStore.setState({ kinds: [] });
});
afterEach(() => vi.useRealTimers());

describe('search store', () => {
  it('debounces and queries search and suggest', async () => {
    vi.mocked(search).mockResolvedValue([hit('get_user')]);
    useSearchStore.getState().setText('ge');
    useSearchStore.getState().setText('get');
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('p1', 'get', undefined, 50);
    expect(suggest).toHaveBeenCalledWith('p1', 'get', 8);
    expect(useSearchStore.getState().results.map((r) => r.name)).toEqual(['get_user']);
    expect(useSearchStore.getState().suggestions).toEqual(['get_user']);
  });

  it('clears results for blank text', async () => {
    useSearchStore.setState({ results: [hit('a')] });
    useSearchStore.getState().setText('   ');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
    expect(useSearchStore.getState().results).toEqual([]);
  });

  it('re-runs with kind filters', async () => {
    vi.mocked(search).mockResolvedValue([]);
    useSearchStore.getState().setText('user');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    useSearchStore.getState().toggleKind('class');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).toHaveBeenLastCalledWith('p1', 'user', ['class'], 50);
    useSearchStore.getState().toggleKind('class');
    expect(useSearchStore.getState().kinds).toEqual([]);
  });

  it('ignores stale responses', async () => {
    let resolveFirst: (v: SearchHit[]) => void = () => undefined;
    vi.mocked(search)
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce([hit('second')]);
    useSearchStore.getState().setText('first');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    useSearchStore.getState().setText('second');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    resolveFirst([hit('first')]);
    await vi.advanceTimersByTimeAsync(0);
    expect(useSearchStore.getState().results.map((r) => r.name)).toEqual(['second']);
  });

  it('reports errors', async () => {
    vi.mocked(search).mockRejectedValue(new Error('engine down'));
    useSearchStore.getState().setText('x');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(useSearchStore.getState().error).toBe('engine down');
    expect(useSearchStore.getState().loading).toBe(false);
  });
});
