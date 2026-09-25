import { Button } from '../../ui/Button';
import { SPEEDS, useMotionStore } from './motion-store';

const small = { padding: '2px 8px' };

export function Transport() {
  const { index, steps, playing, speed, mode, summary, source } = useMotionStore();
  const s = useMotionStore.getState();
  const last = Math.max(0, steps.length - 1);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Button size="sm" title="Step back" onClick={() => s.stepBack()}>
        ⏮
      </Button>
      <Button size="sm" variant="primary" title={playing ? 'Pause' : 'Play'} onClick={() => (playing ? s.pause() : s.play())}>
        {playing ? '⏸ Pause' : '▶ Play'}
      </Button>
      <Button size="sm" title="Step forward" onClick={() => s.stepForward()}>
        ⏭
      </Button>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        Speed
        <select aria-label="Speed" value={speed} onChange={(e) => s.setSpeed(Number(e.target.value))} style={small}>
          {SPEEDS.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
      </label>
      <input
        type="range"
        aria-label="Position"
        min={0}
        max={last}
        value={index}
        onChange={(e) => s.seek(Number(e.target.value))}
        style={{ flex: 1, minWidth: 120 }}
      />
      <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
        Step {Math.min(index + 1, steps.length).toLocaleString()} of {steps.length.toLocaleString()}
      </span>
      {summary?.last_exception && (
        <Button size="sm" variant="danger" onClick={() => s.jumpToException()}>
          Jump to error
        </Button>
      )}
      <div role="group" aria-label="Where to watch" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {(['map', 'inside'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => s.setMode(m)}
            style={{ ...small, border: 'none', cursor: 'pointer', font: 'inherit', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'inherit' }}
          >
            {m === 'map' ? 'Map' : 'Inside'}
          </button>
        ))}
      </div>
      {source === 'walkthrough' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Walkthrough (not a real run)</span>}
      <Button size="sm" onClick={() => s.close()}>
        Close
      </Button>
    </div>
  );
}
