import { getChildren } from '../../api/engine';
import { getHealth, isProblem, severity } from './health-api';

const MAX_DEPTH = 20;

// From a red package down to the element that causes it: at each level follow the worst child (then the one with most errors).
export async function findRootCause(pid: string, startId: string): Promise<string> {
  let id = startId;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const children = await getChildren(pid, id);
    if (children.length === 0) break;
    const states = await getHealth(
      pid,
      children.map((c) => c.id),
    );
    let best: string | null = null;
    for (const c of children) {
      const h = states[c.id];
      if (!h || !isProblem(h.state)) continue;
      const current = best ? states[best] : null;
      if (
        !current ||
        severity(h.state) > severity(current.state) ||
        (h.state === current.state && h.errors > current.errors)
      )
        best = c.id;
    }
    if (!best) break;
    id = best;
  }
  return id;
}
