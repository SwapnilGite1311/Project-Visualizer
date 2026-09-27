import { invoke } from '../../api/bridge';
import { setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';
import { openProjectFlow } from '../import/open-project';
import { TOUR_SEEN_KEY, useTourStore } from './tour-store';

// "Try a sample project": a fresh copy of a small shop, opened on the Explore dashboard, with the tour.
export async function openSampleProject(): Promise<boolean> {
  const { root_path } = await invoke<{ root_path: string }>('pv:sample.create');
  const ok = await openProjectFlow(root_path);
  if (!ok) return false;
  useAppStore.getState().setWorkspace('explore', { left: 'search', right: 'inspector', center: 'canvas' });
  await setSetting(TOUR_SEEN_KEY, true).catch(() => undefined); // this is the first-time tour
  setTimeout(() => useTourStore.getState().start(), 600); // after the map is on screen
  return true;
}
