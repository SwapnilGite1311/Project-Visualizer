// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { NavButtons } from './NavButtons';
import { goUp } from './nav-store';

vi.mock('./nav-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./nav-store')>();
  return { ...actual, goUp: vi.fn(async () => undefined) };
});

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
});

describe('NavButtons', () => {
  it('disables Back, Forward and Up at the start', () => {
    render(<NavButtons />);
    expect(screen.getByLabelText('Back')).toBeDisabled();
    expect(screen.getByLabelText('Forward')).toBeDisabled();
    expect(screen.getByLabelText('Up one level')).toBeDisabled();
    expect(screen.getByLabelText('Project overview')).toBeEnabled();
  });

  it('enables Up below the top level and calls goUp', () => {
    render(<NavButtons />);
    act(() => useAppStore.getState().setParent('package:app'));
    fireEvent.click(screen.getByLabelText('Up one level'));
    expect(goUp).toHaveBeenCalled();
  });
});
