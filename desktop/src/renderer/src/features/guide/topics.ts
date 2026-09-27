// "How do I…" help: tasks in everyday words, each with a few steps and a "Show me" that opens the right dashboard
// and points at the right place.

export interface TourStep {
  target: string; // CSS selector of what to point at
  title: string;
  text: string;
}

export interface HelpTopic {
  id: string;
  title: string;
  keywords: string;
  steps: string[];
  showMe?: { workspace: string; step: TourStep };
}

export const TOPICS: HelpTopic[] = [
  {
    id: 'understand',
    title: 'Understand what the project does',
    keywords: 'overview explain summary start begin map',
    steps: [
      'Open the Explore dashboard (the map icon on the left).',
      'Click "Explain this project" to get a plain-language summary (needs an AI key in Settings → AI).',
      'Click any box to read about it on the right. Double-click it, or keep zooming into it, to see what is inside.',
    ],
    showMe: { workspace: 'explore', step: { target: '[data-area="center"]', title: 'The map', text: 'Each box is a part of your project. Lines show which part uses which. Double-click a box to look inside.' } },
  },
  {
    id: 'find',
    title: 'Find a part by name',
    keywords: 'search look for where is function file class',
    steps: ['Press Ctrl+F or click the search box on the left.', 'Type part of the name.', 'Click a result: the map jumps to it and selects it.'],
    showMe: { workspace: 'explore', step: { target: '[data-area="left"]', title: 'Search', text: 'Type any part of a name here. The chips below narrow it to folders, files, classes or functions.' } },
  },
  {
    id: 'change',
    title: 'See what breaks if I change something',
    keywords: 'impact risk safe change refactor depend break',
    steps: [
      'Open the Change safely dashboard (the shield icon).',
      'Right-click the part you want to change and choose "What breaks if I change this?": everything that depends on it lights up.',
      'Choose "Preview a change…" for a risk score, the reasons, and a go / caution / no-go answer on the right.',
    ],
    showMe: { workspace: 'change', step: { target: '[data-area="center"]', title: 'Right-click a part', text: 'Right-click any box and choose "What breaks if I change this?" or "Preview a change…".' } },
  },
  {
    id: 'watch',
    title: 'Watch my program run',
    keywords: 'live runtime agent connect run trace requests slow',
    steps: [
      'Open the Watch it run dashboard (the pulse icon).',
      'In the Runtime panel at the bottom, the Connect tab shows the exact command, for example: python -m pv_agent run your_script.py',
      'Run it: moving dots are requests; green parts work, amber parts are slow, red parts fail, purple parts hang.',
    ],
    showMe: { workspace: 'run', step: { target: '[data-area="bottom"]', title: 'Connect your program', text: 'The Connect tab shows how to start your program so the map can follow it.' } },
  },
  {
    id: 'errors',
    title: 'Find where an error happens',
    keywords: 'error exception traceback stack crash bug paste',
    steps: [
      'Copy the error (the whole traceback) from wherever you saw it.',
      'Press Ctrl+Shift+V, paste it and click "Find on map": the line where it happened is marked "error here".',
      'With a connected program, every error is listed in the Errors panel with a plain explanation.',
    ],
    showMe: { workspace: 'run', step: { target: '[data-area="bottom"]', title: 'Errors', text: 'Errors from your running program appear here, grouped, with what they mean.' } },
  },
  {
    id: 'whatif',
    title: 'Try a change without risk',
    keywords: 'simulate sandbox what if predict forecast decision',
    steps: [
      'Open the What if dashboard (the flask icon) and click "Open a sandbox": a safe copy of the map.',
      'Right-click parts and choose "Simulate removing this", "Simulate slower…" or "Simulate failures…".',
      'Click "Run simulation": you see how many real requests would fail and a go / caution / no-go answer. Your code is never changed.',
    ],
    showMe: { workspace: 'whatif', step: { target: '[data-area="bottom"]', title: 'The sandbox', text: 'Open a sandbox here, then right-click parts of the map to try changes.' } },
  },
  {
    id: 'history',
    title: 'See how the project changed',
    keywords: 'history git commit time travel version old',
    steps: [
      'Open the History dashboard (the clock icon).',
      'Pick an earlier version (commit) in the list or drag the timeline.',
      'Green parts are new since then, orange ones changed. "Show this version" opens the old code read-only.',
    ],
    showMe: { workspace: 'history', step: { target: '[data-area="bottom"]', title: 'Project history', text: 'Pick a commit here to see what changed since then.' } },
  },
  {
    id: 'ai',
    title: 'Ask the AI to explain',
    keywords: 'ai explain key claude openai model',
    steps: [
      'Open Settings (the gear, top right) → AI, choose a provider and paste your API key.',
      'Click a box and choose "Explain this" (right-click) or press Ctrl+E.',
      'The explanation appears on the right, with links to the parts it mentions.',
    ],
  },
  {
    id: 'colours',
    title: 'What do the colours mean?',
    keywords: 'colour color legend meaning green red amber ring badge',
    steps: [
      'Box colours show the kind of part: blue folders, teal files, amber classes, green functions.',
      'With a running program: a green outline = works, amber = slow or some errors, red = failing, purple and pulsing = hanging.',
      'A ring with a badge like "30% risk" is a prediction; "new" / "changed" come from History; "removed" and "x5" from a sandbox.',
    ],
  },
  {
    id: 'words',
    title: 'The words used in the app',
    keywords: 'glossary words terms module package fan-in simple',
    steps: [
      'The app uses simple words by default: "File" for a module, "Folder" for a package, "Used by" for fan-in.',
      'Settings → Words has a glossary of every word, and a switch for the exact developer terms.',
    ],
  },
];

export const FULL_TOUR: TourStep[] = [
  { target: 'nav[aria-label="Dashboards"]', title: 'Dashboards', text: 'Each dashboard shows only what one job needs: exploring, watching your program run, changing safely, trying things out, or history.' },
  { target: '[data-area="center"]', title: 'The map of your project', text: 'Boxes are folders, files, classes and functions; lines show which part uses which. Double-click a box, or keep zooming into it, to look inside.' },
  { target: '[data-area="right"]', title: 'Details', text: 'Click a box to read about it here: what it is, how big it is, what uses it. "Explanation" describes it in plain words.' },
  { target: '[data-area="left"]', title: 'Search', text: 'Looking for something? Type any part of its name here.' },
  { target: '[data-tour="help"]', title: 'Help', text: 'Stuck? Click here (or press F1) for step-by-step help on every task.' },
];

export function searchTopics(query: string): HelpTopic[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOPICS;
  return TOPICS.filter((t) => `${t.title} ${t.keywords} ${t.steps.join(' ')}`.toLowerCase().includes(q));
}
