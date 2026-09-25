import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../core/store';
import { EmptyState } from '../../ui/EmptyState';
import { shortName } from './FrameDetails';
import type { FloorScene } from './inside-3d';
import { InsideView2D } from './InsideView2D';
import { InsideView3D } from './InsideView3D';
import { type BodyResult, motionBody } from './motion-api';
import { currentStack, currentStep, useMotionStore } from './motion-store';
import { activeBlockId, floorsFor, layoutBlocks } from './scene';

const bodyCache = new Map<string, Promise<BodyResult | null>>();

function bodyOf(pid: string, nodeId: string): Promise<BodyResult | null> {
  const key = pid + '|' + nodeId;
  if (!bodyCache.has(key)) bodyCache.set(key, motionBody(pid, nodeId).catch(() => null));
  return bodyCache.get(key)!;
}

// Center panel: the running function from the inside, in 2D or 3D (follows the global 2D/3D switch).
export function InsideView() {
  const status = useMotionStore((s) => s.status);
  const index = useMotionStore((s) => s.index);
  const steps = useMotionStore((s) => s.steps);
  const projectId = useAppStore((s) => s.projectId);
  const viewMode = useAppStore((s) => s.viewMode);
  const [bodies, setBodies] = useState<Map<string, BodyResult>>(new Map());

  const stack = useMemo(() => (status === 'ready' ? currentStack() : []), [status, index, steps]); // eslint-disable-line react-hooks/exhaustive-deps
  const stackKey = stack.map((f) => f.nodeId).join('|');

  useEffect(() => {
    if (!projectId || !stackKey) return;
    let cancelled = false;
    const ids = [...new Set(stackKey.split('|').filter(Boolean))];
    void Promise.all(ids.map(async (id) => [id, await bodyOf(projectId, id)] as const)).then((entries) => {
      if (cancelled) return;
      setBodies((prev) => {
        const next = new Map(prev);
        for (const [id, body] of entries) if (body) next.set(id, body);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, stackKey]);

  if (status !== 'ready') return <EmptyState title="Record a run in the Code Motion panel" detail="Then choose Inside to watch a function run statement by statement." />;
  const top = stack[stack.length - 1];
  const body = top ? bodies.get(top.nodeId) : undefined;
  const step = currentStep();
  const header = top ? `${shortName(top.nodeId)} · ${body?.file_path ?? ''}:${top.line}` : '';

  if (viewMode === '3d') {
    const floors: FloorScene[] = floorsFor(stack, bodies).map((f) => ({
      ...f,
      platforms: layoutBlocks(bodies.get(f.nodeId)!.blocks),
      title: shortName(f.nodeId),
    }));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '4px 8px', fontSize: 12 }}>{header}</div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <InsideView3D floors={floors} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 8, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, marginBottom: 6 }}>{header}</div>
      {body ? (
        <InsideView2D body={body} activeBlockId={activeBlockId(body.blocks, top.line)} returned={step?.kind === 'return' ? step.value : undefined} />
      ) : (
        <EmptyState title={top ? 'This code has no statements to show' : 'Waiting for the program to start'} />
      )}
    </div>
  );
}
