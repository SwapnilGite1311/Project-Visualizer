// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLiveStore } from './live-store';
import { clockTime, PlaybackBar } from './PlaybackBar';
import { liveView } from './test-data';

const t0 = new Date(2026, 8, 25, 14, 5, 9).getTime();

beforeEach(() => {
  useLiveStore.setState({
    enabled: true,
    paused: false,
    current: null,
    history: [],
    playbackIndex: null,
    lastUpdateAt: null,
  });
  const s = useLiveStore.getState();
  for (let i = 0; i < 5; i++) s.record(liveView({ a: i }), t0 + i * 1000);
});

describe('PlaybackBar', () => {
  it('is live until paused; pausing enables the slider and moving it seeks', () => {
    render(<PlaybackBar />);
    const slider = screen.getByLabelText('Playback position') as HTMLInputElement;
    expect(slider.disabled).toBe(true);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByLabelText('Shown time').textContent).toBe('14:05:13');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(slider.disabled).toBe(false);
    expect(screen.queryByText('Live')).toBeNull();
    fireEvent.change(slider, { target: { value: '1' } });
    expect(useLiveStore.getState().playbackIndex).toBe(1);
    expect(screen.getByLabelText('Shown time').textContent).toBe('14:05:10');

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(useLiveStore.getState().playbackIndex).toBeNull();
    expect(slider.disabled).toBe(true);
  });

  it('formats times', () => {
    expect(clockTime(t0)).toBe('14:05:09');
  });
});
