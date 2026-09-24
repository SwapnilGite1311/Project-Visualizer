import { getSetting, setSetting } from '../../api/main';

const KEY = 'recentProjects';
const MAX = 10;

export function getRecentProjects(): Promise<string[]> {
  return getSetting<string[]>(KEY, []);
}

export async function addRecentProject(root: string): Promise<void> {
  const current = await getRecentProjects();
  await setSetting(KEY, [root, ...current.filter((r) => r !== root)].slice(0, MAX));
}

export async function removeRecentProject(root: string): Promise<void> {
  const current = await getRecentProjects();
  await setSetting(KEY, current.filter((r) => r !== root));
}
