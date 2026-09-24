import { beforeEach, describe, expect, it, vi } from 'vitest';
import { boundaries, entryPoints, hotspots, summary } from '../../api/engine';
import type { Summary } from '../../api/types';
import { useAppStore } from '../../core/store';
import { useInsightsStore } from './insights-store';

vi.mock('../../api/engine', () => ({
  summary: vi.fn(),
  hotspots: vi.fn(),
  entryPoints: vi.fn(),
  boundaries: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(summary).mockResolvedValue({ files: 3 } as Summary);
  vi.mocked(hotspots).mockResolvedValue([]);
  vi.mocked(entryPoints).mockResolvedValue([{ node_id: 'module:main.py', reasons: ['__main__ block'] }]);
  vi.mocked(boundaries).mockResolvedValue([]);
  useAppStore.setState({ projectId: 'p1', graphVersion: 0 });
  useInsightsStore.setState({ summary: null, loadedFor: null, error: null, loading: false });
});

describe('insights store', () => {
  it('loads all four once per project version', async () => {
    await useInsightsStore.getState().load();
    expect(useInsightsStore.getState().summary?.files).toBe(3);
    expect(useInsightsStore.getState().entryPoints).toHaveLength(1);
    expect(useInsightsStore.getState().loadedFor).toBe('p1:0');
    await useInsightsStore.getState().load();
    expect(summary).toHaveBeenCalledTimes(1);
    useAppStore.setState({ graphVersion: 1 });
    await useInsightsStore.getState().load();
    expect(summary).toHaveBeenCalledTimes(2);
  });

  it('records errors and allows a retry', async () => {
    vi.mocked(hotspots).mockRejectedValueOnce(new Error('boom'));
    await useInsightsStore.getState().load();
    expect(useInsightsStore.getState().error).toBe('boom');
    expect(useInsightsStore.getState().loadedFor).toBeNull();
    await useInsightsStore.getState().load();
    expect(useInsightsStore.getState().error).toBeNull();
  });
});
