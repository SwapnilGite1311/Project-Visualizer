import { describe, expect, it } from 'vitest';
import { encodeMessage, FrameDecoder } from './framing';

describe('framing', () => {
  it('round trips one message', () => {
    expect(new FrameDecoder().push(encodeMessage('{"a":1}'))).toEqual(['{"a":1}']);
  });

  it('decodes two messages from one chunk', () => {
    const chunk = Buffer.concat([encodeMessage('one'), encodeMessage('two')]);
    expect(new FrameDecoder().push(chunk)).toEqual(['one', 'two']);
  });

  it('waits for a message split across chunks', () => {
    const data = encodeMessage('{"split":true}');
    const decoder = new FrameDecoder();
    expect(decoder.push(data.subarray(0, 5))).toEqual([]);
    expect(decoder.push(data.subarray(5, 20))).toEqual([]);
    expect(decoder.push(data.subarray(20))).toEqual(['{"split":true}']);
  });

  it('counts bytes for non-ASCII text', () => {
    const data = encodeMessage('é');
    expect(data.toString('ascii').startsWith('Content-Length: 2\r\n')).toBe(true);
    expect(new FrameDecoder().push(data)).toEqual(['é']);
  });

  it('throws on a header without Content-Length', () => {
    expect(() => new FrameDecoder().push(Buffer.from('X: 1\r\n\r\nabc'))).toThrow('bad message header');
  });
});
