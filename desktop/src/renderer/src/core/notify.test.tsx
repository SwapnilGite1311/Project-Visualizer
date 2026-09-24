// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notify, useToasts } from './notify';
import { Toasts } from './Toasts';

beforeEach(() => {
  useToasts.setState({ items: [] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('notify and Toasts', () => {
  it('shows an error until dismissed', () => {
    render(<Toasts />);
    act(() => {
      notify.error('Oops', 'x');
    });
    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Oops')).not.toBeInTheDocument();
  });

  it('removes info toasts after 4 seconds', () => {
    vi.useFakeTimers();
    render(<Toasts />);
    act(() => {
      notify.info('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
