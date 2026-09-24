// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEdges } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { gnode } from '../../view/test-data';
import { EdgeList, shortLabel } from './EdgeList';

vi.mock('../../api/engine', () => ({ getEdges: vi.fn() }));
vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const id = 'function:app/utils.py#is_valid';
const edge = (kind: 'calls' | 'imports', source: string, target: string, weight = 1) => ({
  id: `${kind}|${source}|${target}`,
  kind,
  source_id: source,
  target_id: target,
  weight,
  resolved: true,
});

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
});

describe('EdgeList', () => {
  it('computes short labels', () => {
    expect(shortLabel('method:app/s.py#UserService.get_user')).toBe('UserService.get_user');
    expect(shortLabel('module:app/utils.py')).toBe('app/utils.py');
  });

  it('groups incoming and outgoing edges by kind and reveals on click', async () => {
    vi.mocked(getEdges).mockResolvedValue([
      edge('calls', 'method:app/services.py#UserService.get_user', id, 2),
      edge('calls', 'function:app/api/routes.py#get_user_route', id),
      edge('imports', 'module:app/services.py', id),
    ]);
    render(<EdgeList node={gnode(id, 'function')} />);
    expect(await screen.findByText('calls (2)')).toBeInTheDocument();
    expect(screen.getByText('imports (1)')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('get_user_route'));
    expect(revealNode).toHaveBeenCalledWith('function:app/api/routes.py#get_user_route');
    expect(screen.getAllByText('Nothing')).toHaveLength(1);
  });
});
