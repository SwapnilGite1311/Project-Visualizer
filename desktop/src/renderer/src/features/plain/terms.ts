// Everyday words for code terms, so people who do not write code can follow the map. Developers can switch them
// off in Settings → Words. Every feature that shows a kind, a metric or a link type uses these.

interface KindWords {
  one: string;
  many: string;
  what: string;
}

const KINDS: Record<string, KindWords> = {
  project: { one: 'Project', many: 'Projects', what: 'The whole program you opened.' },
  package: { one: 'Folder', many: 'Folders', what: 'A folder of code files that belong together (a package).' },
  module: { one: 'File', many: 'Files', what: 'One file of code. It groups related functions and classes.' },
  class: { one: 'Class', many: 'Classes', what: 'A blueprint for things the program works with, like a Customer or an Order.' },
  function: { one: 'Function', many: 'Functions', what: 'A named step the program can run, like "add to cart".' },
  method: { one: 'Function in a class', many: 'Functions in classes', what: 'A step that belongs to a class, like "Order.pay".' },
  variable: { one: 'Value', many: 'Values', what: 'A named piece of data the program keeps.' },
  statement: { one: 'Line', many: 'Lines', what: 'One instruction in the code.' },
  external: { one: 'Outside library', many: 'Outside libraries', what: 'Code written by others that this project uses.' },
};

const EXACT: Record<string, { one: string; many: string }> = {
  project: { one: 'project', many: 'projects' },
  package: { one: 'package', many: 'packages' },
  module: { one: 'module', many: 'modules' },
  class: { one: 'class', many: 'classes' },
  function: { one: 'function', many: 'functions' },
  method: { one: 'method', many: 'methods' },
  variable: { one: 'variable', many: 'variables' },
  statement: { one: 'statement', many: 'statements' },
  external: { one: 'external', many: 'externals' },
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function plainKind(kind: string, simple = true): string {
  if (!simple) return cap(EXACT[kind]?.one ?? kind);
  return KINDS[kind]?.one ?? cap(kind);
}

export function plainKindPlural(kind: string, simple = true): string {
  if (!simple) return cap(EXACT[kind]?.many ?? `${kind}s`);
  return KINDS[kind]?.many ?? `${cap(kind)}s`;
}

export function whatIs(kind: string): string {
  return KINDS[kind]?.what ?? '';
}

const METRICS: Record<string, { simple: string; exact: string; explain: string }> = {
  loc: { simple: 'Lines', exact: 'Lines of code', explain: 'How many lines of code it has.' },
  complexity: {
    simple: 'Complexity',
    exact: 'Cyclomatic complexity',
    explain: 'How many different paths the code can take (ifs, loops). Higher means harder to test and change.',
  },
  fan_in: { simple: 'Used by', exact: 'Fan-in', explain: 'How many other parts use this one. Changing it can affect all of them.' },
  fan_out: { simple: 'Uses', exact: 'Fan-out', explain: 'How many other parts this one depends on.' },
};

export function plainMetric(name: string, simple = true): string {
  const m = METRICS[name];
  if (!m) return name;
  return simple ? m.simple : m.exact;
}

export function explainMetric(name: string): string {
  return METRICS[name]?.explain ?? '';
}

const EDGES: Record<string, { simple: string; explain: string }> = {
  imports: { simple: 'uses', explain: 'One file uses code from another (import).' },
  calls: { simple: 'calls', explain: 'One function runs another.' },
  inherits: { simple: 'builds on', explain: 'A class builds on another class (inherits from it).' },
  references: { simple: 'mentions', explain: 'One part mentions another by name.' },
};

export function plainEdge(kind: string, simple = true): string {
  if (!simple) return kind;
  return EDGES[kind]?.simple ?? kind;
}

export function explainEdge(kind: string): string {
  return EDGES[kind]?.explain ?? '';
}

// Glossary rows for Settings → Words and Help: developer word, simple word, meaning.
export function glossary(): Array<{ word: string; simple: string; meaning: string }> {
  const rows = Object.keys(KINDS)
    .filter((k) => k !== 'project')
    .map((k) => ({ word: EXACT[k].one, simple: KINDS[k].one, meaning: KINDS[k].what }));
  for (const [k, m] of Object.entries(METRICS)) rows.push({ word: k === 'loc' ? 'LOC' : m.exact.toLowerCase(), simple: m.simple, meaning: m.explain });
  for (const [k, e] of Object.entries(EDGES)) rows.push({ word: k, simple: e.simple, meaning: e.explain });
  return rows;
}
