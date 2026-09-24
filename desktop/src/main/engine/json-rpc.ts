export interface RpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown;
}

export interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface RpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: unknown;
}

export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

function isObject(msg: unknown): msg is Record<string, unknown> {
  return typeof msg === 'object' && msg !== null && !Array.isArray(msg);
}

export function isResponse(msg: unknown): msg is RpcResponse {
  return isObject(msg) && 'id' in msg && ('result' in msg || 'error' in msg);
}

export function isNotification(msg: unknown): msg is RpcNotification {
  return isObject(msg) && typeof msg.method === 'string' && !('id' in msg);
}
