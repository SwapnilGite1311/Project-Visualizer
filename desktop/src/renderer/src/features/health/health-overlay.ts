import type { NodeStyle, Overlay } from '../../core/overlay';
import type { HealthInfo } from './health-api';

export const HEALTH_COLORS = {
  ok: '#22c55e',
  warning: '#f59e0b',
  stalled: '#a855f7',
  error: '#ef4444',
} as const;

// Health colors. The engine already passes a child's state up to its packages, so every level is colored.
export function buildHealthOverlay(states: Record<string, HealthInfo>): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const [id, h] of Object.entries(states)) {
    if (h.state === 'ok') nodes[id] = { borderColor: HEALTH_COLORS.ok };
    else if (h.state === 'warning') nodes[id] = { color: HEALTH_COLORS.warning };
    else if (h.state === 'stalled')
      nodes[id] = { color: HEALTH_COLORS.stalled, pulse: true, badge: 'stalled' };
    else if (h.state === 'error')
      nodes[id] = { color: HEALTH_COLORS.error, badge: h.errors > 0 ? `${h.errors} err` : 'error' };
  }
  return { priority: 30, nodes, edges: {} };
}
