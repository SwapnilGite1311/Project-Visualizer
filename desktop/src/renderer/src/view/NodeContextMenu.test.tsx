// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../core/registry';
import { NodeContextMenu } from './NodeContextMenu';
import { gnode } from './test-data';

const node = gnode('class:app/models.py#User', 'class');

describe('NodeContextMenu', () => {
  it('lists actions in order and runs one', () => {
    const r = createRegistry();
    const explain = vi.fn();
    r.addNodeAction({ id: 'impact', title: 'What breaks?', order: 2, run: vi.fn() });
    r.addNodeAction({ id: 'explain', title: 'Explain', order: 1, run: explain });
    const onClose = vi.fn();
    render(<NodeContextMenu node={node} x={10} y={20} onClose={onClose} registry={r} />);
    expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).toEqual(['Explain', 'What breaks?']);
    fireEvent.click(screen.getByText('Explain'));
    expect(explain).toHaveBeenCalledWith(node);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape and shows a placeholder without actions', () => {
    const onClose = vi.fn();
    render(<NodeContextMenu node={node} x={0} y={0} onClose={onClose} registry={createRegistry()} />);
    expect(screen.getByText('No actions')).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
