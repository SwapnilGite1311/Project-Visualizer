// Ancestor ids (root first, the node itself last) for many nodes, cached per project and graph version.
import { getAncestors } from '../../api/engine';
import { useAppStore } from '../../core/store';

const cache = new Map<string, Promise<string[]>>();

export async function ancestorsById(pid: string, ids: string[]): Promise<Record<string, string[]>> {
  const version = useAppStore.getState().graphVersion;
  const unique = [...new Set(ids.filter(Boolean))];
  const lists = await Promise.all(
    unique.map((id) => {
      const key = `${pid}|${version}|${id}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          getAncestors(pid, id).then(
            (nodes) => nodes.map((n) => n.id),
            () => [id],
          ),
        );
      }
      return cache.get(key)!;
    }),
  );
  return Object.fromEntries(unique.map((id, i) => [id, lists[i]]));
}

export function clearAncestorCache(): void {
  cache.clear();
}
