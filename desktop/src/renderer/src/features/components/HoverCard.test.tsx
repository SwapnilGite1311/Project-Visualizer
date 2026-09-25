// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { HOVER_DELAY_MS, HoverCard } from './HoverCard';

vi.mock('../../api/engine', () => ({ getNode: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getNode).mockResolvedValue({ ...gnode('function:app/utils.py#is_valid', 'function', 2), file_path: 'app/utils.py' });
  useAppStore.setState({ projectId: 'p1', hoveredNodeId: null });
});
afterEach(() => vi.useRealTimers());

describe('HoverCard', () => {
  it('appears after the delay and hides immediately', async () => {
    render(<HoverCard />);
    act(() => useAppStore.setState({ hoveredNodeId: 'function:app/utils.py#is_valid' }));
    await act(async () => vi.advanceTimersByTime(HOVER_DELAY_MS - 50));
    expect(screen.queryByRole('tooltip')).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(50));
    expect(screen.getByRole('tooltip')).toHaveTextContent('is_valid');
    expect(screen.getByRole('tooltip')).toHaveTextContent('app/utils.py:1–2');
    act(() => useAppStore.setState({ hoveredNodeId: null }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
