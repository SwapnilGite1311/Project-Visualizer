// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revealNode } from '../../view/reveal';
import { BoundariesTable } from './BoundariesTable';
import { EntryPointsList } from './EntryPointsList';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));
beforeEach(() => vi.clearAllMocks());

describe('EntryPointsList', () => {
  it('shows entries with reasons and reveals on click', () => {
    render(<EntryPointsList entryPoints={[{ node_id: 'module:app/main.py', reasons: ['__main__ block', 'not imported'] }]} />);
    expect(screen.getByText('__main__ block · not imported')).toBeInTheDocument();
    fireEvent.click(screen.getByText('app/main.py'));
    expect(revealNode).toHaveBeenCalledWith('module:app/main.py');
  });
});

describe('BoundariesTable', () => {
  it('renders one row per package and reveals on click', () => {
    render(
      <BoundariesTable
        boundaries={[
          { node_id: 'package:app', name: 'app', internal_edges: 14, outgoing_edges: 0, incoming_edges: 2, instability: 0 },
          { node_id: 'package:api', name: 'api', internal_edges: 1, outgoing_edges: 4, incoming_edges: 0, instability: 1 },
        ]}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'api instability' })).toHaveAttribute('aria-valuenow', '1');
    fireEvent.click(screen.getByText('api'));
    expect(revealNode).toHaveBeenCalledWith('package:api');
  });
});
