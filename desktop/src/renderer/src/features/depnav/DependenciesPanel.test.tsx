// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import { DependenciesPanel } from './DependenciesPanel';
import { useDepnavStore } from './depnav-store';
import { usePathDialog } from './path-dialog-store';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));
vi.mock('./deps-api', () => ({ neighbors: vi.fn(), findPath: vi.fn(), cycles: vi.fn() }));
vi.mock('../../api/engine', () => ({ getAncestors: vi.fn(async () => []) }));

const setDirection = vi.fn(async () => undefined);
beforeEach(() => {
  vi.clearAllMocks();
  usePathDialog.setState({ open: false });
  useDepnavStore.setState({ root: null, result: null, error: null, loading: false, cycles: null, setDirection });
});

describe('DependenciesPanel', () => {
  it('asks for a root first', () => {
    render(<DependenciesPanel />);
    expect(screen.getByText('Right-click an element and choose Show dependencies')).toBeInTheDocument();
  });

  it('lists neighbours by distance, switches direction and reveals', () => {
    useDepnavStore.setState({
      root: gnode('function:a.py#f', 'function'),
      direction: 'both',
      result: {
        root_id: 'function:a.py#f',
        edges: [],
        items: [
          { node_id: 'function:b.py#g', distance: 1, direction: 'out', ancestor_ids: [] },
          { node_id: 'module:c.py', distance: 2, direction: 'in', ancestor_ids: [] },
        ],
      },
    });
    render(<DependenciesPanel />);
    expect(screen.getByRole('list', { name: 'Direct' })).toHaveTextContent('→g');
    expect(screen.getByRole('list', { name: '2 steps away' })).toHaveTextContent('←c.py');
    fireEvent.click(screen.getByText('Used by'));
    expect(setDirection).toHaveBeenCalledWith('in');
    fireEvent.click(screen.getByText('g'));
    expect(revealNode).toHaveBeenCalledWith('function:b.py#g');
    fireEvent.click(screen.getByText('Find path to…'));
    expect(usePathDialog.getState().open).toBe(true);
  });
});
