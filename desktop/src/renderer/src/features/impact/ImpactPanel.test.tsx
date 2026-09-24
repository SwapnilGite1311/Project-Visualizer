// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { gnode } from '../../view/test-data';
import { useImpactStore } from './impact-store';
import { ImpactPanel } from './ImpactPanel';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useImpactStore.setState({ rootNode: null, result: null, loading: false, error: null });
});

function showResult(level: 'low' | 'medium' | 'high' | 'critical') {
  useImpactStore.setState({
    rootNode: gnode('class:app/services.py#UserService', 'class'),
    result: {
      root_id: 'class:app/services.py#UserService',
      affected: [
        { node_id: 'function:main.py#main', distance: 1, via: 'calls', from_id: 'x', ancestor_ids: [] },
        { node_id: 'module:app/api/routes.py', distance: 2, via: 'imports', from_id: 'x', ancestor_ids: [] },
      ],
      risk: { score: 80, level, factors: ['4 direct dependents', '0 indirect dependents', 'spans 2 packages'] },
    },
  });
}

describe('ImpactPanel', () => {
  it('explains how to start when empty', () => {
    render(<ImpactPanel />);
    expect(screen.getByText("Right-click an element and choose 'What breaks if I change this?'")).toBeInTheDocument();
  });

  it('shows the risk level, factors and affected nodes', () => {
    showResult('critical');
    render(<ImpactPanel />);
    expect(screen.getByText('If you change UserService:')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Risk 80/100')).toBeInTheDocument();
    expect(screen.getByText('spans 2 packages')).toBeInTheDocument();
    expect(screen.getByText('Directly affected (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('main'));
    expect(revealNode).toHaveBeenCalledWith('function:main.py#main');
  });

  it('clears the analysis', () => {
    showResult('low');
    render(<ImpactPanel />);
    expect(screen.getByText('low')).toBeInTheDocument();
    act(() => screen.getByText('Clear').click());
    expect(useImpactStore.getState().result).toBeNull();
  });
});
