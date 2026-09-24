import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { gnode } from '../../view/test-data';
import register from './register';

describe('inspector feature', () => {
  it('adds the details panel and an open-in-editor action for nodes with a file', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('right').map((p) => [p.id, p.title])).toEqual([['inspector', 'Details']]);
    const withFile = { ...gnode('function:a.py#f', 'function'), file_path: 'a.py' };
    expect(r.nodeActions(withFile).map((a) => a.id)).toEqual(['open-in-editor']);
    expect(r.nodeActions(gnode('package:app', 'package'))).toEqual([]);
  });
});
