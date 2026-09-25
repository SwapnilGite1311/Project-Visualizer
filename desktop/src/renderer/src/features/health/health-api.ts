// Typed calls for health (contracts/rpc/health).
import { rpc } from '../../api/bridge';
import type { Health } from '../../api/types';

export interface HealthInfo {
  state: Health;
  calls: number;
  errors: number;
  error_rate: number;
  p95_ms: number;
  stalled: boolean;
  reason: string;
}

export interface Thresholds {
  window_ms: number;
  error_rate: number;
  warn_p95_ms: number;
  stall_ms: number;
  loop_calls: number;
}

// Without node ids the engine returns every element whose state is known.
export async function getHealth(
  pid: string,
  nodeIds?: string[],
): Promise<Record<string, HealthInfo>> {
  return (
    await rpc<{ states: Record<string, HealthInfo> }>('health.get', {
      project_id: pid,
      ...(nodeIds ? { node_ids: nodeIds } : {}),
    })
  ).states;
}

export async function getThresholds(pid: string): Promise<Thresholds> {
  return (await rpc<{ thresholds: Thresholds }>('health.config', { project_id: pid })).thresholds;
}

export async function setThresholds(
  pid: string,
  partial: Partial<Thresholds>,
): Promise<Thresholds> {
  return (
    await rpc<{ thresholds: Thresholds }>('health.config', { project_id: pid, thresholds: partial })
  ).thresholds;
}

const SEVERITY: Record<Health, number> = { unknown: 0, ok: 1, warning: 2, stalled: 3, error: 4 };
export const severity = (h: Health | undefined) => SEVERITY[h ?? 'unknown'] ?? 0;
export const isProblem = (h: Health | undefined) => severity(h) >= SEVERITY.warning;
