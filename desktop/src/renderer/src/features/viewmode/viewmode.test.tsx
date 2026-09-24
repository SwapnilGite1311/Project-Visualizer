// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { ViewModeToggle } from './ViewModeToggle';
import register, { toggleViewMode } from './register';

beforeEach(() => useAppStore.setState({ viewMode: '2d' }));

describe('view mode', () => {
  it('switches with the toggle', () => {
    render(<ViewModeToggle />);
    expect(screen.getByText('2D')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('3D'));
    expect(useAppStore.getState().viewMode).toBe('3d');
    expect(screen.getByText('3D')).toHaveAttribute('aria-pressed', 'true');
  });

  it('registers the toolbar item and the toggle command', () => {
    const r = createRegistry();
    register(r);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['view-mode']);
    expect(r.commands()[0]).toMatchObject({ id: 'view.toggle3d', shortcut: 'Ctrl+Shift+3' });
    toggleViewMode();
    expect(useAppStore.getState().viewMode).toBe('3d');
    toggleViewMode();
    expect(useAppStore.getState().viewMode).toBe('2d');
  });
});
