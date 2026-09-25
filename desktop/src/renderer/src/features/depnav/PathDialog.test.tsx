// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { search } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { PathDialog } from './PathDialog';
import { useDepnavStore } from './depnav-store';

vi.mock('../../api/engine', () => ({ search: vi.fn(), getAncestors: vi.fn(async () => []) }));
vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const findPathTo = vi.fn(async () => undefined);
beforeEach(() => {
  vi.mocked(search).mockResolvedValue([
    { node_id: 'package:app', name: 'app', kind: 'package', file_path: '', qualified_name: 'app', score: 100 },
  ]);
  useAppStore.setState({ projectId: 'p1' });
  useDepnavStore.setState({ root: gnode('module:main.py', 'module'), path: null, findPathTo });
});

describe('PathDialog', () => {
  it('searches, finds a path and lists its steps', async () => {
    render(<PathDialog onClose={() => undefined} />);
    expect(screen.getByText('Find a path from main.py')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'app' } });
    fireEvent.click(await screen.findByText('app'));
    expect(search).toHaveBeenCalledWith('p1', 'app', undefined, 10);
    expect(findPathTo).toHaveBeenCalledWith('package:app');
    act(() =>
      useDepnavStore.setState({ path: { found: true, node_ids: ['function:main.py#main', 'function:app/a.py#f'], edge_ids: ['e'] } }),
    );
    await waitFor(() => expect(screen.getByRole('list', { name: 'Path' })).toHaveTextContent('mainf'));
  });

  it('says when there is no path', async () => {
    render(<PathDialog onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'app' } });
    fireEvent.click(await screen.findByText('app'));
    act(() => useDepnavStore.setState({ path: { found: false, node_ids: [], edge_ids: [] } }));
    expect(screen.getByText('No path found within 8 steps.')).toBeInTheDocument();
  });
});
