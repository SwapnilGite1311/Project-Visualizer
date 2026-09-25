import type { ComponentType } from 'react';

export interface NodeRef {
  id: string;
  kind: string;
  name: string;
  qualified_name: string;
  file_path: string;
  span: { start_line: number; start_col: number; end_line: number; end_col: number };
}
export type PanelArea = 'left' | 'center' | 'right' | 'bottom';
export interface PanelDef { id: string; title: string; area: PanelArea; order: number; component: ComponentType }
export interface CommandDef { id: string; title: string; shortcut?: string; run: () => void | Promise<void> }
export interface NodeActionDef {
  id: string;
  title: string;
  order: number;
  when?: (node: NodeRef) => boolean;
  run: (node: NodeRef) => void | Promise<void>;
}
export interface SettingsSectionDef { id: string; title: string; order: number; component: ComponentType }
export interface StatusItemDef { id: string; order: number; component: ComponentType }
export interface ScreenDef { id: string; component: ComponentType }
export interface ToolbarItemDef { id: string; order: number; side: 'left' | 'right'; component: ComponentType }
export interface WelcomeActionDef {
  id: string;
  title: string;
  description: string;
  order: number;
  run: () => void | Promise<void>;
}
export interface GlobalDef { id: string; component: ComponentType }
export interface AppRegistry {
  addPanel(def: PanelDef): void;
  addCommand(def: CommandDef): void;
  addNodeAction(def: NodeActionDef): void;
  addSettingsSection(def: SettingsSectionDef): void;
  addStatusItem(def: StatusItemDef): void;
  addScreen(def: ScreenDef): void;
  addToolbarItem(def: ToolbarItemDef): void;
  addWelcomeAction(def: WelcomeActionDef): void;
  addGlobal(def: GlobalDef): void;
}
export interface RegistryReader {
  panels(area: PanelArea): PanelDef[];
  commands(): CommandDef[];
  nodeActions(node: NodeRef): NodeActionDef[];
  settingsSections(): SettingsSectionDef[];
  statusItems(): StatusItemDef[];
  screen(id: string): ScreenDef | undefined;
  toolbarItems(side: 'left' | 'right'): ToolbarItemDef[];
  welcomeActions(): WelcomeActionDef[];
  globals(): GlobalDef[];
}

type Item = { id: string; order?: number };

function sorted<T extends Item>(items: Iterable<T>): T[] {
  return [...items].sort((a, b) => {
    const oa = a.order ?? Number.POSITIVE_INFINITY;
    const ob = b.order ?? Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa < ob ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

class Category<T extends Item> {
  private readonly items = new Map<string, T>();
  constructor(private readonly name: string) {}
  add(def: T): void {
    if (this.items.has(def.id)) throw new Error(`duplicate ${this.name} id: ${def.id}`);
    this.items.set(def.id, def);
  }
  list(): T[] {
    return sorted(this.items.values());
  }
  get(id: string): T | undefined {
    return this.items.get(id);
  }
}

export function createRegistry(): AppRegistry & RegistryReader {
  const panels = new Category<PanelDef>('panel');
  const commands = new Category<CommandDef>('command');
  const nodeActions = new Category<NodeActionDef>('nodeAction');
  const settingsSections = new Category<SettingsSectionDef>('settingsSection');
  const statusItems = new Category<StatusItemDef>('statusItem');
  const screens = new Category<ScreenDef>('screen');
  const toolbarItems = new Category<ToolbarItemDef>('toolbarItem');
  const welcomeActions = new Category<WelcomeActionDef>('welcomeAction');
  const globals = new Category<GlobalDef>('global');
  return {
    addPanel: (d) => panels.add(d),
    addCommand: (d) => commands.add(d),
    addNodeAction: (d) => nodeActions.add(d),
    addSettingsSection: (d) => settingsSections.add(d),
    addStatusItem: (d) => statusItems.add(d),
    addScreen: (d) => screens.add(d),
    addToolbarItem: (d) => toolbarItems.add(d),
    addWelcomeAction: (d) => welcomeActions.add(d),
    addGlobal: (d) => globals.add(d),
    panels: (area) => panels.list().filter((p) => p.area === area),
    commands: () => commands.list(),
    nodeActions: (node) => nodeActions.list().filter((a) => !a.when || a.when(node)),
    settingsSections: () => settingsSections.list(),
    statusItems: () => statusItems.list(),
    screen: (id) => screens.get(id),
    toolbarItems: (side) => toolbarItems.list().filter((t) => t.side === side),
    welcomeActions: () => welcomeActions.list(),
    globals: () => globals.list(),
  };
}

export const appRegistry: AppRegistry & RegistryReader = createRegistry();
