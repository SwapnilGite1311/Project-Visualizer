import { useEffect } from 'react';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { TextInput } from '../../ui/TextInput';
import { FrameDetails } from './FrameDetails';
import { cancelRecording, pickTraceFile } from './motion-api';
import { currentStack, currentStep, useMotionStore } from './motion-store';
import { Transport } from './Transport';
import { startWalkthrough } from './walkthrough';

const pane = { padding: 8, height: '100%', overflowY: 'auto' as const, boxSizing: 'border-box' as const };
const muted = { color: 'var(--text-muted)', fontSize: 12 };

async function loadFromFile() {
  const path = await pickTraceFile();
  if (path) await useMotionStore.getState().load(path);
}

function walkthrough() {
  const { selectedNodeId } = useAppStore.getState();
  const kind = selectedNodeId?.slice(0, selectedNodeId.indexOf(':')) ?? '';
  startWalkthrough(selectedNodeId ? { id: selectedNodeId, kind } : undefined).catch((e: unknown) =>
    notify.error('Could not walk through', e instanceof Error ? e.message : String(e)),
  );
}

function Idle() {
  const { python, command, setCommand, record } = useMotionStore();
  const projectId = useAppStore((s) => s.projectId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
      <TextInput label="Command" value={command} placeholder="main.py  or  -m pytest tests/test_app.py" onChange={setCommand} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" disabled={!projectId || !command.trim()} onClick={() => void record()}>
          Record and play
        </Button>
        <Button disabled={!projectId} onClick={() => void loadFromFile()}>
          Load trace…
        </Button>
        <Button disabled={!projectId} onClick={walkthrough}>
          Walk through without running
        </Button>
      </div>
      <div style={muted}>
        {python === undefined
          ? 'Looking for Python…'
          : python
            ? `Python ${python.version} found`
            : 'Python 3.9+ was not found — you can still walk through without running.'}
      </div>
      <div style={muted}>This runs your program on your computer, like running it in a terminal.</div>
    </div>
  );
}

function Output() {
  const { run, summary } = useMotionStore();
  if (!run && !summary?.truncated) return null;
  return (
    <details style={{ fontSize: 12 }}>
      <summary>
        Program output {run?.exit_code !== undefined && run?.exit_code !== null ? `(exit code ${run.exit_code})` : ''}
        {run?.timed_out ? ' — stopped after 2 minutes' : ''}
      </summary>
      {summary?.truncated && <div style={{ color: 'var(--danger)' }}>Recording stopped after {summary.steps_total.toLocaleString()} events.</div>}
      {run && <pre style={{ margin: 0, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{(run.stdout + run.stderr).trim() || '(no output)'}</pre>}
    </details>
  );
}

export function MotionPanel() {
  const status = useMotionStore((s) => s.status);
  const error = useMotionStore((s) => s.error);
  const index = useMotionStore((s) => s.index);
  const steps = useMotionStore((s) => s.steps);

  useEffect(() => {
    if (useMotionStore.getState().python === undefined) void useMotionStore.getState().checkPython();
  }, []);

  if (status === 'recording') {
    return (
      <div style={{ ...pane, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner />
        <span>Running your program…</span>
        <Button size="sm" onClick={() => void cancelRecording()}>
          Cancel
        </Button>
      </div>
    );
  }
  if (status === 'loading') {
    return (
      <div style={{ ...pane, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner />
        <span>Loading the recording…</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div style={pane}>
        <p style={{ color: 'var(--danger)', whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{error}</p>
        <Output />
        <Button size="sm" onClick={() => useMotionStore.getState().close()}>
          Back
        </Button>
      </div>
    );
  }
  if (status !== 'ready') {
    return (
      <div style={pane}>
        <Idle />
      </div>
    );
  }
  // index and steps are read so the details re-render on every step.
  const step = steps[index] ? currentStep() : null;
  return (
    <div style={{ ...pane, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Transport />
      <FrameDetails stack={currentStack()} step={step} />
      <Output />
    </div>
  );
}
