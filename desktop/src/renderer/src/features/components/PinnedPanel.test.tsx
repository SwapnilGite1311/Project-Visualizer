// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import { PinnedPanel } from './PinnedPanel';
import { useComponentStates } from './states-store';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));
vi.mock('../../api/main', () => ({ getSetting: vi.fn(), setSetting: vi.fn(async () => true) }));
vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

beforeEach(() => {
  vi.mocked(getNode).mockImplementation(async (_p, id) => {
    if (id === 'class:gone.py#X') throw new Error('node not found');
    return gnode(id, 'class');
  });
  useAppStore.setState({ projectId: 'p1', projectRoot: 'C:/code/app' });
  useComponentStates.setState({ pinned: [] });
});

describe('PinnedPanel', () => {
  it('shows an empty state', () => {
    render(<PinnedPanel />);
    expect(screen.getByText('Right-click an element and choose Pin')).toBeInTheDocument();
  });

  it('lists pins, reveals and unpins', async () => {
    useComponentStates.setState({ pinned: ['class:a.py#A', 'class:gone.py#X'] });
    render(<PinnedPanel />);
    fireEvent.click(await screen.findByText('A'));
    expect(revealNode).toHaveBeenCalledWith('class:a.py#A');
    expect(screen.getByText('(not found)')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Unpin A'));
    expect(useComponentStates.getState().pinned).toEqual(['class:gone.py#X']);
  });
});
