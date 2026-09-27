// Dashboards (workspaces): which panels each area shows. Without any registered dashboard every panel shows.
import type { PanelArea, PanelDef, RegistryReader, WorkspaceDef } from './registry';

type Reader = Pick<RegistryReader, 'panels' | 'workspaces'>;

export function activeWorkspace(registry: Reader, id: string): WorkspaceDef | undefined {
  const all = registry.workspaces();
  return all.find((w) => w.id === id) ?? all[0];
}

// The panels of an area in the dashboard, in registry order.
export function panelsFor(registry: Reader, area: PanelArea, workspaceId: string): PanelDef[] {
  const panels = registry.panels(area);
  const ws = activeWorkspace(registry, workspaceId);
  const allowed = ws?.panels?.[area];
  if (!allowed) return panels;
  return panels.filter((p) => allowed.includes(p.id));
}

export function isVisible(registry: Reader, area: PanelArea, panelId: string, workspaceId: string): boolean {
  return panelsFor(registry, area, workspaceId).some((p) => p.id === panelId);
}

// A feature asked to show a panel the open dashboard hides: the first dashboard (in order) that has it, preferring a
// focused one over one that shows everything.
export function workspaceWith(registry: Reader, area: PanelArea, panelId: string): WorkspaceDef | undefined {
  const withIt = registry.workspaces().filter((w) => isVisible(registry, area, panelId, w.id));
  return withIt.find((w) => w.panels?.[area]) ?? withIt[0];
}
