import { Button } from '../../ui/Button';
import { useSimStore } from './sim-store';

// A striped amber banner while the map shows a sandbox: simulated state must never look like the real one.
export function SandboxBanner() {
  const active = useSimStore((s) => s.active);
  const inside = useSimStore((s) => s.inside);
  const loading = useSimStore((s) => s.loading);
  if (!active || !inside) return null;
  return (
    <div
      role="status"
      aria-label="Simulation sandbox"
      style={{
        position: 'fixed',
        top: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 8,
        color: '#111',
        background: 'repeating-linear-gradient(135deg, #fbbf24 0 12px, #f59e0b 12px 24px)',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
      }}
    >
      <span>
        Simulation sandbox &lsquo;{active.label}&rsquo; — nothing here changes your real code
      </span>
      <Button size="sm" disabled={loading} onClick={() => void useSimStore.getState().run()}>
        Run simulation
      </Button>
      <Button size="sm" onClick={() => useSimStore.getState().exit()}>
        Exit
      </Button>
      <Button size="sm" variant="danger" onClick={() => void useSimStore.getState().discard()}>
        Discard
      </Button>
    </div>
  );
}
