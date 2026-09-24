import { describe, expect, it } from 'vitest';
import { createRegistry, type NodeRef } from './registry';

const Dummy = () => null;
const node = (kind: string): NodeRef => ({
  id: `${kind}:a.py#x`,
  kind,
  name: 'x',
  qualified_name: 'a.x',
  file_path: 'a.py',
  span: { start_line: 1, start_col: 0, end_line: 2, end_col: 0 },
});

describe('registry', () => {
  it('sorts by order then id', () => {
    const r = createRegistry();
    r.addPanel({ id: 'b', title: 'B', area: 'right', order: 2, component: Dummy });
    r.addPanel({ id: 'a', title: 'A', area: 'right', order: 2, component: Dummy });
    r.addPanel({ id: 'z', title: 'Z', area: 'right', order: 1, component: Dummy });
    r.addPanel({ id: 'l', title: 'L', area: 'left', order: 0, component: Dummy });
    expect(r.panels('right').map((p) => p.id)).toEqual(['z', 'a', 'b']);
    r.addCommand({ id: 'c2', title: 'two', run: () => undefined });
    r.addCommand({ id: 'c1', title: 'one', run: () => undefined });
    expect(r.commands().map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('rejects duplicate ids per category', () => {
    const r = createRegistry();
    r.addScreen({ id: 'welcome', component: Dummy });
    expect(() => r.addScreen({ id: 'welcome', component: Dummy })).toThrow('duplicate screen id: welcome');
    expect(() => r.addGlobal({ id: 'welcome', component: Dummy })).not.toThrow();
  });

  it('filters node actions with when', () => {
    const r = createRegistry();
    r.addNodeAction({ id: 'explain', title: 'Explain', order: 1, run: () => undefined });
    r.addNodeAction({ id: 'fn-only', title: 'F', order: 2, when: (n) => n.kind === 'function', run: () => undefined });
    expect(r.nodeActions(node('function')).map((a) => a.id)).toEqual(['explain', 'fn-only']);
    expect(r.nodeActions(node('class')).map((a) => a.id)).toEqual(['explain']);
  });

  it('returns undefined for an unknown screen', () => {
    expect(createRegistry().screen('x')).toBeUndefined();
  });
});
