// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CyclesSection } from './CyclesSection';
import { useDepnavStore } from './depnav-store';

vi.mock('./deps-api', () => ({ neighbors: vi.fn(), findPath: vi.fn(), cycles: vi.fn() }));
vi.mock('../../api/engine', () => ({ getAncestors: vi.fn(async () => []) }));

const loadCycles = vi.fn(async () => undefined);
const highlightCycle = vi.fn(async () => undefined);
beforeEach(() => {
  vi.clearAllMocks();
  useDepnavStore.setState({ cycles: null, cycleLevel: 2, loadCycles, highlightCycle });
});

describe('CyclesSection', () => {
  it('finds cycles at the chosen level', () => {
    render(<CyclesSection />);
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Find cycles'));
    expect(loadCycles).toHaveBeenCalledWith(4);
  });

  it('lists cycles as loops and highlights one on click', () => {
    useDepnavStore.setState({ cycles: [{ node_ids: ['module:a.py', 'module:b.py', 'module:c.py'] }] });
    render(<CyclesSection />);
    fireEvent.click(screen.getByText('a.py → b.py → c.py → a.py'));
    expect(highlightCycle).toHaveBeenCalledWith({ node_ids: ['module:a.py', 'module:b.py', 'module:c.py'] });
  });

  it('says when there are none', () => {
    useDepnavStore.setState({ cycles: [] });
    render(<CyclesSection />);
    expect(screen.getByText('No circular dependencies at this level')).toBeInTheDocument();
  });
});
