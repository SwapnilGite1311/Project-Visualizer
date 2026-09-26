import { BaseEdge, type EdgeProps, useStore, useViewport } from '@xyflow/react';
import { curveBasis, line } from 'd3-shape';
import { memo, useEffect, useRef } from 'react';
import type { LayoutPoint } from '../../view/model';
import type { PvFlowEdge } from './rf-elements';

const path = line<LayoutPoint>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveBasis);

// An edge along the engine's polyline (through the bends of long edges), smoothed with d3-shape.
export const FlowEdge = memo(function FlowEdge({ id, data, sourceX, sourceY, targetX, targetY, markerEnd }: EdgeProps<PvFlowEdge>) {
  const points = data?.points && data.points.length >= 2 ? data.points : [
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
  ];
  const d = path(points) ?? '';
  return (
    <BaseEdge
      id={id}
      path={d}
      markerEnd={markerEnd}
      className={data?.animated ? 'pv-rf-edge pv-rf-animated' : 'pv-rf-edge'}
      style={{ stroke: data?.color, strokeWidth: data?.width ?? 1.5, opacity: data?.opacity ?? 1 }}
    />
  );
});

// Where a particle is after travelling `t` (0..1) along a polyline.
export function pointAt(points: LayoutPoint[], t: number): LayoutPoint {
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(l);
    total += l;
  }
  let left = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : left / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * Math.min(1, f),
        y: points[i].y + (points[i + 1].y - points[i].y) * Math.min(1, f),
      };
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}

// A canvas layer above the map: small dots travel along animated edges (live runtime flows), drawn every frame.
export function FlowParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = useViewport();
  const edges = useStore((s) => s.edges) as PvFlowEdge[];
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    const animated = edges.filter((e) => e.data?.animated && (e.data.points?.length ?? 0) >= 2);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (animated.length === 0 || typeof requestAnimationFrame !== 'function') {
      const width = canvas.width; // resizing a canvas clears it (no 2D context needed)
      canvas.width = 0;
      canvas.width = width;
      return;
    }
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    let frame = 0;
    let handle = 0;
    const draw = () => {
      const { x, y, zoom } = viewportRef.current;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (const e of animated) {
        ctx!.fillStyle = e.data!.color;
        for (let k = 0; k < 3; k++) {
          const p = pointAt(e.data!.points, ((frame / 90 + k / 3) % 1 + 1) % 1);
          ctx!.beginPath();
          ctx!.arc(p.x * zoom + x, p.y * zoom + y, Math.max(2, 3 * zoom), 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [edges]);

  return <canvas ref={canvasRef} className="pv-rf-particles" aria-hidden="true" />;
}
