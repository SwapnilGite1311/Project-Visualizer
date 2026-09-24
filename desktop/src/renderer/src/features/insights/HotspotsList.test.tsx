// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import type { GraphNode, Hotspot } from '../../api/types';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { useImpactStore } from '../impact/impact-store';
import { HotspotsList } from './HotspotsList';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));
vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));

const spot = (name: string, score: number): Hotspot =>
  ({ node_id: 'function:app/x.py::' + name, kind: 'function', name, file_path: 'app/x.py', score, reasons: ['many callers'] }) as Hotspot;

const run = vi.fn(async () => undefined);
beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ projectId: 'p1' });
  useImpactStore.setState({ run });
});

describe('HotspotsList', () => {
  it('renders rows in the given order and reveals on click', () => {
    render(<HotspotsList hotspots={[spot('a', 90), spot('b', 40)]} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((r) => r.querySelector('strong')?.textContent)).toEqual(['a', 'b']);
    expect(screen.getByRole('meter', { name: 'a score' })).toHaveAttribute('aria-valuenow', '90');
    fireEvent.click(screen.getByText('b'));
    expect(revealNode).toHaveBeenCalledWith('function:app/x.py::b');
  });

  it('runs impact analysis without revealing', async () => {
    const node = { id: 'function:app/x.py::a', name: 'a' } as GraphNode;
    vi.mocked(getNode).mockResolvedValue(node);
    render(<HotspotsList hotspots={[spot('a', 90)]} />);
    fireEvent.click(screen.getByText('What breaks?'));
    await waitFor(() => expect(run).toHaveBeenCalledWith(node));
    expect(getNode).toHaveBeenCalledWith('p1', 'function:app/x.py::a');
    expect(revealNode).not.toHaveBeenCalled();
  });
});
