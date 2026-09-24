import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeImpact, getAncestors } from '../../api/engine';
import { useToasts } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { useImpactStore } from './impact-store';

vi.mock('../../api/engine', () => ({ analyzeImpact: vi.fn(), getAncestors: vi.fn() }));
const node = gnode('function:app/utils.py#is_valid', 'function');

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
  useImpactStore.getState().clear();
  useToasts.setState({ items: [] });
});

describe('useImpactStore', () => {
  it('runs the analysis, sets the overlay and shows the panel', async () => {
    vi.mocked(analyzeImpact).mockResolvedValue({
      root_id: node.id,
      affected: [{ node_id: 'module:app/services.py', distance: 1, via: 'imports', from_id: node.id, ancestor_ids: ['project:', 'module:app/services.py'] }],
      risk: { score: 24, level: 'medium', factors: ['1 direct dependents', '0 indirect dependents', 'spans 1 packages'] },
    });
    vi.mocked(getAncestors).mockResolvedValue([gnode('project:', 'project'), gnode('module:app/utils.py', 'module'), node]);
    await useImpactStore.getState().run(node);
    expect(useImpactStore.getState().result?.risk.score).toBe(24);
    expect(useAppStore.getState().overlays.impact.nodes['module:app/services.py'].badge).toBe('d1');
    expect(useAppStore.getState().activePanel.bottom).toBe('impact');
    useImpactStore.getState().clear();
    expect(useAppStore.getState().overlays.impact).toBeUndefined();
    expect(useImpactStore.getState().result).toBeNull();
  });

  it('reports failures', async () => {
    vi.mocked(analyzeImpact).mockRejectedValue(new Error('project not ready: p1'));
    await useImpactStore.getState().run(node);
    expect(useImpactStore.getState().error).toBe('project not ready: p1');
    expect(useToasts.getState().items[0].title).toBe('Impact analysis failed');
  });
});
