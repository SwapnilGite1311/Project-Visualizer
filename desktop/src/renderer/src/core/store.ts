import { create } from 'zustand';
import type { Overlay } from './overlay';
import type { PanelArea } from './registry';

export interface AppState {
  screen: string;
  projectId: string | null;
  projectRoot: string | null;
  projectState: string;
  currentParentId: string;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusNodeId: string | null;
  viewMode: '2d' | '3d';
  overlays: Record<string, Overlay>;
  graphVersion: number;
  settingsOpen: boolean;
  activePanel: Record<PanelArea, string | null>;
  workspace: string; // the open dashboard (see workspaces.ts)
  setScreen(screen: string): void;
  setProjectState(state: string): void;
  openedProject(id: string, root: string): void;
  closedProject(): void;
  setParent(id: string): void;
  select(id: string | null): void;
  hover(id: string | null): void;
  setFocus(id: string | null): void;
  setViewMode(mode: '2d' | '3d'): void;
  setOverlay(id: string, overlay: Overlay | null): void;
  bumpGraphVersion(): void;
  setSettingsOpen(open: boolean): void;
  showPanel(area: PanelArea, id: string): void;
  setWorkspace(id: string, start?: Partial<Record<PanelArea, string>>): void;
}

export const WORKSPACE_KEY = 'pv.layout.workspace';
function loadWorkspace(): string {
  try {
    return localStorage.getItem(WORKSPACE_KEY) || 'explore';
  } catch {
    return 'explore'; // storage blocked: start on the first dashboard
  }
}

const initialData = {
  screen: 'welcome',
  projectId: null,
  projectRoot: null,
  projectState: 'idle',
  currentParentId: 'project:',
  selectedNodeId: null,
  hoveredNodeId: null,
  focusNodeId: null,
  viewMode: '2d' as const,
  overlays: {},
  graphVersion: 0,
  settingsOpen: false,
  activePanel: { left: null, center: null, right: null, bottom: null },
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialData,
  workspace: loadWorkspace(),
  setScreen: (screen) => set({ screen }),
  setProjectState: (projectState) => set({ projectState }),
  openedProject: (id, root) =>
    set((s) => ({
      screen: 'workspace',
      projectId: id,
      projectRoot: root,
      currentParentId: 'project:',
      selectedNodeId: null,
      hoveredNodeId: null,
      focusNodeId: null,
      overlays: {},
      graphVersion: s.graphVersion + 1,
    })),
  closedProject: () => set((s) => ({ ...initialData, viewMode: s.viewMode, workspace: s.workspace })),
  setParent: (id) => set({ currentParentId: id, selectedNodeId: null }),
  select: (selectedNodeId) => set({ selectedNodeId }),
  hover: (hoveredNodeId) => set({ hoveredNodeId }),
  setFocus: (focusNodeId) => set({ focusNodeId }),
  setViewMode: (viewMode) => set({ viewMode }),
  setOverlay: (id, overlay) =>
    set((s) => {
      const overlays = { ...s.overlays };
      if (overlay) overlays[id] = overlay;
      else delete overlays[id];
      return { overlays };
    }),
  bumpGraphVersion: () => set((s) => ({ graphVersion: s.graphVersion + 1 })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  showPanel: (area, id) => set((s) => ({ activePanel: { ...s.activePanel, [area]: id } })),
  setWorkspace: (workspace, start = {}) => {
    try {
      localStorage.setItem(WORKSPACE_KEY, workspace);
    } catch {
      // not remembered; still switches for this session
    }
    set((s) => ({ workspace, activePanel: { ...s.activePanel, ...start } }));
  },
}));
