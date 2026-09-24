// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  const commands = () => [
    { id: 'open', title: 'Open folder', shortcut: 'Ctrl+O', run: vi.fn() },
    { id: 'settings', title: 'Open settings', run: vi.fn() },
    { id: 'up', title: 'Go up one level', run: vi.fn() },
  ];

  it('filters commands by the typed text', () => {
    render(<CommandPalette open onClose={() => undefined} commands={commands()} />);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Search commands'), { target: { value: 'OPEN' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
  });

  it('runs the selected command on Enter and closes', () => {
    const list = commands();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={list} />);
    const input = screen.getByLabelText('Search commands');
    fireEvent.change(input, { target: { value: 'open' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(list[1].run).toHaveBeenCalledTimes(1);
    expect(list[0].run).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
