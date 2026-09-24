// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new Error('kaboom');
  return <div>all good</div>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows a fallback and retries', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary name="Inspector">
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Inspector failed to load.')).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByText('Retry'));
    expect(screen.getByText('all good')).toBeInTheDocument();
  });
});
