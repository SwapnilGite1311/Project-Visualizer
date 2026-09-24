// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import { NodeActionsBar } from './NodeActionsBar';

describe('NodeActionsBar', () => {
  it('shows one button per action and runs it', () => {
    const r = createRegistry();
    const run = vi.fn();
    r.addNodeAction({ id: 'explain', title: 'Explain this', order: 10, run });
    r.addNodeAction({ id: 'never', title: 'Hidden', order: 20, when: () => false, run: vi.fn() });
    const node = gnode('class:a.py#A', 'class');
    render(<NodeActionsBar node={node} registry={r} />);
    expect(screen.queryByText('Hidden')).toBeNull();
    fireEvent.click(screen.getByText('Explain this'));
    expect(run).toHaveBeenCalledWith(node);
  });
});
