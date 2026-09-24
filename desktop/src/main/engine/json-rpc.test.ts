import { describe, expect, it } from 'vitest';
import { isNotification, isResponse, RpcError } from './json-rpc';

describe('json-rpc', () => {
  it('recognises responses', () => {
    expect(isResponse({ jsonrpc: '2.0', id: 1, result: {} })).toBe(true);
    expect(isResponse({ jsonrpc: '2.0', id: 1, error: { code: 1, message: 'x' } })).toBe(true);
    expect(isResponse({ jsonrpc: '2.0', method: 'a' })).toBe(false);
    expect(isResponse(null)).toBe(false);
  });

  it('recognises notifications', () => {
    expect(isNotification({ jsonrpc: '2.0', method: 'project.progress', params: {} })).toBe(true);
    expect(isNotification({ jsonrpc: '2.0', id: 3, method: 'x' })).toBe(false);
    expect(isNotification('text')).toBe(false);
  });

  it('keeps the engine error code', () => {
    const e = new RpcError(-32002, 'x');
    expect(e.code).toBe(-32002);
    expect(e.message).toBe('x');
    expect(e).toBeInstanceOf(Error);
  });
});
