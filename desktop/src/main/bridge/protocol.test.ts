import { describe, expect, it } from 'vitest';
import { parseClientMessage } from './protocol';

describe('parseClientMessage', () => {
  it('accepts valid messages', () => {
    expect(parseClientMessage('{"type":"hello","token":"t","client":"vscode","version":"0.1.0"}')).toEqual({
      type: 'hello',
      token: 't',
      client: 'vscode',
      version: '0.1.0',
    });
    expect(parseClientMessage('{"type":"reveal","file_path":"C:/a.py","line":3}')).toEqual({ type: 'reveal', file_path: 'C:/a.py', line: 3 });
    expect(parseClientMessage('{"type":"explain","file_path":"/a.py","line":1,"extra":true}')).toEqual({ type: 'explain', file_path: '/a.py', line: 1 });
  });

  it('rejects everything else', () => {
    for (const raw of [
      'not json',
      '[]',
      'null',
      '{"type":"shutdown"}',
      '{"type":"hello","token":"","client":"vscode","version":"1"}',
      '{"type":"reveal","file_path":"a.py","line":0}',
      '{"type":"reveal","file_path":"a.py","line":1.5}',
      '{"type":"reveal","file_path":"a.py","line":"3"}',
      '{"type":"explain","line":3}',
    ]) {
      expect(parseClientMessage(raw)).toBeNull();
    }
  });
});
