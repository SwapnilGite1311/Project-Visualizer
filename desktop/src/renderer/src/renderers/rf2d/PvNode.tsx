import { Handle, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import { NODE_HEIGHT, type PvFlowNode } from './rf-elements';

const hidden = { opacity: 0, pointerEvents: 'none' as const, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 };

// One element of the map: kind colour, label, overlay badge; a thick border when selected.
export const PvNode = memo(function PvNode({ data }: NodeProps<PvFlowNode>) {
  return (
    <div
      className={data.pulse ? 'pv-rf-node pv-rf-pulse' : 'pv-rf-node'}
      title={data.badge ? `${data.label} [${data.badge}]` : data.label}
      style={{
        width: data.width,
        height: NODE_HEIGHT,
        opacity: data.opacity,
        borderColor: data.selected ? 'var(--accent, #f59e0b)' : data.borderColor,
        borderWidth: data.selected ? 3 : 2,
        ['--pv-kind' as string]: data.color,
      }}
    >
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <span className="pv-rf-dot" style={{ background: data.color }} />
      <span className="pv-rf-label">{data.label}</span>
      {data.badge && <span className="pv-rf-badge">{data.badge}</span>}
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
});
