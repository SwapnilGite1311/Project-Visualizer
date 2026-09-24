import { describe, expect, it } from 'vitest';
import { citationsToLinks, parseNodeHref } from './citation-links';

describe('citation links', () => {
  it('turns cited markers into links and drops unknown ones', () => {
    const md = 'Uses get_user [[node:method:app/s.py#UserService.get_user]] and x [[node:function:nope.py#x]].';
    const out = citationsToLinks(md, [{ id: 'method:app/s.py#UserService.get_user', name: 'get_user' }]);
    expect(out).toBe('Uses get_user [get_user](#pvnode=method%3Aapp%2Fs.py%23UserService.get_user) and x .');
  });

  it('decodes node links only', () => {
    expect(parseNodeHref('#pvnode=method%3Aapp%2Fs.py%23UserService.get_user')).toBe('method:app/s.py#UserService.get_user');
    expect(parseNodeHref('https://example.com')).toBeNull();
  });
});
