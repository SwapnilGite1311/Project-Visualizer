import { ProgressBar } from '../../ui/ProgressBar';
import { useImportStore } from './import-store';

function stateLabel(state: string | undefined, done: number, total: number): string {
  if (state === 'scanning') return 'Finding files…';
  if (state === 'parsing') return `Reading code… ${done} / ${total} files`;
  if (state === 'linking') return 'Connecting the pieces…';
  return 'Working…';
}

export function ProgressView() {
  const loading = useImportStore((s) => s.loading);
  const root = useImportStore((s) => s.root);
  const progress = useImportStore((s) => s.progress);
  if (!loading) return null;
  const done = progress?.files_done ?? 0;
  const total = progress?.files_total ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <div style={{ color: 'var(--fg-muted)', wordBreak: 'break-all' }}>{root}</div>
      <div>{stateLabel(progress?.state ?? 'scanning', done, total)}</div>
      <ProgressBar value={done} max={Math.max(1, total)} label="Import progress" />
    </div>
  );
}
