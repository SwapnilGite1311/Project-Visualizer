import { describe, expect, it } from 'vitest';
import { cleanCitations, extractCitationIds } from './citations';

describe('citations', () => {
  it('extracts whole ids including # / . and :', () => {
    const text = 'Calls C.m [[node:method:app/a.py#C.m]] and f [[node:function:app/a.py#f]] and again [[node:method:app/a.py#C.m]].';
    expect(extractCitationIds(text)).toEqual(['method:app/a.py#C.m', 'function:app/a.py#f']);
  });

  it('keeps valid citations and removes invalid ones', () => {
    const valid = new Map([['class:app/models.py#User', 'User']]);
    const text = 'Uses User [[node:class:app/models.py#User]] and Ghost [[node:class:nope.py#Ghost]]. User [[node:class:app/models.py#User]] again.';
    const result = cleanCitations(text, valid);
    expect(result.text).toBe(
      'Uses User [[node:class:app/models.py#User]] and Ghost. User [[node:class:app/models.py#User]] again.',
    );
    expect(result.cited).toEqual([{ id: 'class:app/models.py#User', name: 'User' }]);
  });
});
