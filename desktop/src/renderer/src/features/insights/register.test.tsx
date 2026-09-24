// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useExplainStore } from '../explain/explain-store';
import { InsightsPanel } from './InsightsPanel';
import { useInsightsStore } from './insights-store';
import register from './register';
import { sampleSummary } from './test-data';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));

describe('insights feature', () => {
  it('registers the left panel', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('left').map((p) => [p.id, p.order])).toEqual([['insights', 20]]);
  });

  it('loads on mount and explains the architecture', async () => {
    const load = vi.fn(async () => undefined);
    const explain = vi.fn(async () => undefined);
    const project = { id: 'project:', kind: 'project', name: 'app' } as GraphNode;
    vi.mocked(getNode).mockResolvedValue(project);
    useAppStore.setState({ projectId: 'p1' });
    useInsightsStore.setState({ summary: sampleSummary, hotspots: [], entryPoints: [], boundaries: [], loading: false, error: null, load });
    useExplainStore.setState({ explain });
    render(<InsightsPanel />);
    expect(load).toHaveBeenCalled();
    expect(screen.getByText('Hotspots')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Explain the architecture'));
    await waitFor(() => expect(explain).toHaveBeenCalledWith(project));
    expect(getNode).toHaveBeenCalledWith('p1', 'project:');
  });
});
