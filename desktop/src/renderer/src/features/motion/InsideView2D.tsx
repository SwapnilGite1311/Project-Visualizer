import { useMemo } from 'react';
import type { BodyResult } from './motion-api';
import { layoutBlocks, ROW, WIDTH } from './scene';

const PAD = 28;
const HEIGHT = 40;

interface Props {
  body: BodyResult;
  activeBlockId: string | null;
  returned?: string;
}

// The statements of the running function as a path; the runner moves to the statement being executed.
export function InsideView2D({ body, activeBlockId, returned }: Props) {
  const platforms = useMemo(() => layoutBlocks(body.blocks), [body]);
  const active = platforms.find((p) => p.blockId === activeBlockId) ?? null;
  const height = Math.max(ROW, platforms.length * ROW) + 40;

  return (
    <svg
      role="img"
      aria-label={`Statements of ${body.node_id}`}
      width={WIDTH + PAD + 220}
      height={height}
      style={{ display: 'block', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}
    >
      {platforms.map((p) => {
        const isActive = p.blockId === activeBlockId;
        return (
          <g key={p.blockId} data-block-id={p.blockId} aria-current={isActive ? 'step' : undefined} transform={`translate(${PAD + p.x}, ${p.y + 6})`}>
            <rect
              width={p.width}
              height={HEIGHT}
              rx={8}
              fill={p.color}
              fillOpacity={isActive ? 0.35 : 0.14}
              stroke={isActive ? '#fbbf24' : 'none'}
              strokeWidth={2}
              style={isActive ? { filter: 'drop-shadow(0 0 6px #fbbf24)' } : undefined}
            />
            <rect width={5} height={HEIGHT} rx={2} fill={p.color} />
            <text x={14} y={16} fill="var(--text-muted, #94a3b8)" fontSize={10}>
              {p.kind} · line {p.line}
            </text>
            <text x={14} y={31} fill="var(--text, currentColor)">
              {p.text.length > 70 ? p.text.slice(0, 69) + '…' : p.text}
            </text>
          </g>
        );
      })}
      {active && (
        <g data-testid="runner" style={{ transform: `translate(${PAD + active.x - 14}px, ${active.y + 6 + HEIGHT / 2}px)`, transition: 'transform 250ms ease' }}>
          <circle r={9} fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 5px #fbbf24)' }} />
        </g>
      )}
      {active && (
        <g transform={`translate(${PAD + active.x + active.width + 12}, ${active.y + 6})`}>
          {body.blocks
            .find((b) => b.id === active.blockId)
            ?.calls.slice(0, 4)
            .map((c, k) => (
              <text key={c} x={0} y={14 + k * 14} fill="#38bdf8">
                → {c}
              </text>
            ))}
          {returned !== undefined && (
            <text x={0} y={HEIGHT + 12} fill="#10b981">
              ⟵ {returned}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
