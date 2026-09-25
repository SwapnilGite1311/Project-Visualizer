import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useLiveStore } from './live-store';

const pad = (n: number) => String(n).padStart(2, '0');
export const clockTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function PlaybackBar() {
  const { paused, history, playbackIndex, lastUpdateAt } = useLiveStore();
  const s = useLiveStore.getState();
  const shownAt = paused && playbackIndex !== null ? history[playbackIndex]?.at : lastUpdateAt;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button size="sm" onClick={() => (paused ? s.resume() : s.pause())}>
        {paused ? 'Resume' : 'Pause'}
      </Button>
      <input
        type="range"
        aria-label="Playback position"
        min={0}
        max={Math.max(0, history.length - 1)}
        value={paused && playbackIndex !== null ? playbackIndex : Math.max(0, history.length - 1)}
        disabled={!paused || history.length < 2}
        onChange={(e) => s.seek(Number(e.target.value))}
        style={{ flex: 1, minWidth: 120 }}
      />
      <span aria-label="Shown time" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
        {shownAt ? clockTime(shownAt) : '--:--:--'}
      </span>
      {!paused && <Badge tone="success">Live</Badge>}
    </div>
  );
}
