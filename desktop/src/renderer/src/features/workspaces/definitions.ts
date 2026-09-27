import type { WorkspaceDef } from '../../core/registry';

// One dashboard per job. Each lists only the panels that job needs; "All tools" shows everything.
export interface DashboardIntro {
  title: string;
  text: string;
  actions: Array<{ label: string; command: string }>; // command ids run by the "Try this" buttons
}

export interface Dashboard extends WorkspaceDef {
  intro?: DashboardIntro;
}

export const DASHBOARDS: Dashboard[] = [
  {
    id: 'explore',
    title: 'Explore',
    icon: 'map',
    order: 1,
    description: 'See what the project is made of and what each part does.',
    panels: { left: ['search', 'insights', 'pinned'], center: ['canvas'], right: ['inspector', 'explanation'], bottom: [] },
    start: { left: 'search', right: 'inspector', center: 'canvas' },
    intro: {
      title: 'Explore your project',
      text: 'This map shows the parts of your project: folders, files, classes and functions. Lines show which part uses which. Click a part to read about it on the right; double-click it, or keep zooming into it, to look inside.',
      actions: [
        { label: 'Explain this project', command: 'workspaces.explainProject' },
        { label: 'Find something', command: 'search.focus' },
      ],
    },
  },
  {
    id: 'run',
    title: 'Watch it run',
    icon: 'pulse',
    order: 2,
    description: 'Connect your running program and see which parts work, slow down or fail.',
    panels: { left: ['search'], center: ['canvas'], right: ['health', 'inspector'], bottom: ['runtime', 'errors', 'fixes'] },
    start: { right: 'health', bottom: 'runtime', center: 'canvas' },
    intro: {
      title: 'Watch your program run',
      text: 'Start your program with the Project Visualizer agent and the map comes alive: moving dots are requests, green parts work, amber parts are slow and red parts fail. Errors are listed at the bottom with a plain explanation.',
      actions: [
        { label: 'How do I connect my program?', command: 'help.watch' },
        { label: 'Find an error on the map', command: 'errors.paste' },
      ],
    },
  },
  {
    id: 'change',
    title: 'Change safely',
    icon: 'shield',
    order: 3,
    description: 'Before you change something, see what it affects and how risky it is.',
    panels: { left: ['search', 'pinned'], center: ['canvas'], right: ['inspector', 'recommendation'], bottom: ['impact', 'change-preview', 'dependencies'] },
    start: { right: 'inspector', bottom: 'impact', center: 'canvas' },
    intro: {
      title: 'Change code safely',
      text: 'Right-click any part and choose "What breaks if I change this?" or "Preview a change…". You will see everything that depends on it, how risky the change is, and a go / caution / no-go answer.',
      actions: [
        { label: 'How does this work?', command: 'help.change' },
        { label: 'Find a part', command: 'search.focus' },
      ],
    },
  },
  {
    id: 'whatif',
    title: 'What if',
    icon: 'flask',
    order: 4,
    description: 'Try changes in a safe copy, predict problems and get a go / no-go answer.',
    panels: { left: [], center: ['canvas'], right: ['recommendation', 'prediction', 'forecast'], bottom: ['simulation'] },
    start: { right: 'recommendation', bottom: 'simulation', center: 'canvas' },
    intro: {
      title: 'Try it before you do it',
      text: 'Open a sandbox: a safe copy of the map where you can remove, slow down or break parts and replay the requests your program really made. Predictions and the forecast show what may go wrong next; the Decision panel sums it all up.',
      actions: [
        { label: 'Open a sandbox', command: 'sim.start' },
        { label: 'Predict problems', command: 'prediction.run' },
      ],
    },
  },
  {
    id: 'history',
    title: 'History',
    icon: 'clock',
    order: 5,
    description: 'See how the project changed over time and watch code move.',
    panels: { left: [], center: ['canvas', 'motion-inside'], right: ['inspector'], bottom: ['history', 'motion'] },
    start: { bottom: 'history', center: 'canvas', right: 'inspector' },
    intro: {
      title: 'See how the project changed',
      text: 'Pick an earlier version (a Git commit) to see what was added, changed or removed since then, or open that version read-only. Code Motion replays how calls travel through the code.',
      actions: [{ label: 'Show project history', command: 'history.open' }],
    },
  },
  {
    id: 'all',
    title: 'All tools',
    icon: 'grid',
    order: 6,
    description: 'Every panel at once, for experienced users.',
  },
];
