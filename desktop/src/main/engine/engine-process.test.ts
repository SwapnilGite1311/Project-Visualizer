import { describe, expect, it } from 'vitest';
import { EngineClient } from './engine-client';
import { spawnEngine } from './engine-process';

// A tiny fake engine: parses framed requests on stdin and answers every one with {pong:true}.
const FAKE_ENGINE = `
let buf = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const end = buf.indexOf('\\r\\n\\r\\n');
    if (end < 0) return;
    const len = Number(/content-length:\\s*(\\d+)/i.exec(buf.subarray(0, end).toString())[1]);
    if (buf.length < end + 4 + len) return;
    const req = JSON.parse(buf.subarray(end + 4, end + 4 + len).toString());
    buf = buf.subarray(end + 4 + len);
    const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { pong: true } }));
    process.stdout.write(Buffer.concat([Buffer.from('Content-Length: ' + body.length + '\\r\\n\\r\\n'), body]));
  }
});
`;

describe('spawnEngine', () => {
  it('talks JSON-RPC to a child process and reports exit', async () => {
    const handle = spawnEngine(process.execPath, ['-e', FAKE_ENGINE]);
    const client = new EngineClient(handle.transport, { timeoutMs: 10000 });
    await expect(client.request('engine.ping')).resolves.toEqual({ pong: true });
    const exited = new Promise<number | null>((resolve) => handle.onExit(resolve));
    handle.kill();
    await expect(exited).resolves.not.toBe(0);
  });
});
