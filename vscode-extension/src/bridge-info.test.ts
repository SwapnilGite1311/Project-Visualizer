import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBridgeInfo } from './bridge-info';

const reader = (content: string | Error) => (path: string) => {
  expect(path).toBe(join('/home/u', '.project-visualizer', 'bridge.json'));
  if (content instanceof Error) throw content;
  return content;
};

describe('readBridgeInfo', () => {
  it('reads port and token', () => {
    expect(readBridgeInfo('/home/u', reader('{"port":47101,"token":"abc","pid":7}'))).toEqual({ port: 47101, token: 'abc' });
  });

  it('returns null for missing or invalid files', () => {
    expect(readBridgeInfo('/home/u', reader(new Error('ENOENT')))).toBeNull();
    expect(readBridgeInfo('/home/u', reader('not json'))).toBeNull();
    expect(readBridgeInfo('/home/u', reader('{"port":"47101","token":"abc"}'))).toBeNull();
    expect(readBridgeInfo('/home/u', reader('{"port":47101,"token":""}'))).toBeNull();
    expect(readBridgeInfo('/home/u', reader('null'))).toBeNull();
  });
});
