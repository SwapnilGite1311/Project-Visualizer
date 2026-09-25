// Test helper (not a feature file): live level views for runtime tests.
import { gnode } from '../../view/test-data';
import type { LiveLevelView, LiveStats } from './runtime-api';

export const stats = (calls: number, extra: Partial<LiveStats> = {}): LiveStats => ({
  calls,
  errors: 0,
  stalls: 0,
  p95_ms: 1,
  health: 'ok',
  ...extra,
});

export function liveView(
  calls: Record<string, number>,
  flows: LiveLevelView['flows'] = [],
): LiveLevelView {
  return {
    parent: gnode('project:', 'project'),
    nodes: Object.keys(calls).map((id) => gnode(id, 'module')),
    edges: [],
    live: Object.fromEntries(Object.entries(calls).map(([id, n]) => [id, stats(n)])),
    flows,
  };
}
