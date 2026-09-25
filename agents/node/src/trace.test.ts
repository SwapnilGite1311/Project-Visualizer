import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import type { RuntimeEvent } from './events.js';
import { setTraceTarget, trace } from './trace.js';

describe('trace', () => {
  it('passes through when the agent is not running', () => {
    setTraceTarget(null);
    expect(trace('x', () => 42)).toBe(42);
  });

  it('records nested sync and async calls as parent and child', async () => {
    const events: RuntimeEvent[] = [];
    setTraceTarget({ config: loadConfig({ PV_RUNTIME_TOKEN: 't', PV_SERVICE: 'svc' })!, emit: (e) => events.push(e) });
    try {
      const total = await trace('checkout', async () => {
        const a = trace('price', () => 2);
        await new Promise((r) => setTimeout(r, 5));
        const b = await trace('tax', async () => 1);
        return a + b;
      });
      expect(total).toBe(3);
      expect(() => trace('boom', () => JSON.parse('{'))).toThrow(SyntaxError);
    } finally {
      setTraceTarget(null);
    }
    const byName = Object.fromEntries(events.map((e) => [e.name, e]));
    expect(Object.keys(byName).sort()).toEqual(['boom', 'checkout', 'price', 'tax']);
    const root = byName.checkout;
    expect(root.parent_span_id).toBeNull();
    expect(byName.price.parent_span_id).toBe(root.span_id);
    expect(byName.tax.parent_span_id).toBe(root.span_id); // after an await: context kept
    expect(byName.price.trace_id).toBe(root.trace_id);
    expect(root.duration_ns).toBeGreaterThanOrEqual(4_000_000);
    expect(root.kind).toBe('call');
    expect(root.file_path).toMatch(/src\/trace\.test\.ts$/); // the caller
    expect(root.line).toBeGreaterThan(0);
    expect(byName.boom).toMatchObject({ status: 'error', parent_span_id: null });
    expect(byName.boom.error?.type).toBe('SyntaxError');
  });
});

// Runs a real program with `node --import <dist/register.js>`; needs `pnpm build` first.
const REGISTER = fileURLToPath(new URL('../dist/register.js', import.meta.url));

describe.skipIf(!existsSync(REGISTER))('node --import @pv/agent-node/register', () => {
  it('sends requests, traced calls and the crash of a real program', async () => {
    const bodies: Array<{ auth: string; body: { source: { agent: string }; events: RuntimeEvent[] } }> = [];
    const hub = createServer((req, res) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        bodies.push({ auth: String(req.headers.authorization), body: JSON.parse(data) });
        res.end('{"accepted":1}');
      });
    });
    await new Promise<void>((r) => hub.listen(0, '127.0.0.1', r));
    const port = (hub.address() as AddressInfo).port;
    const dir = mkdtempSync(join(tmpdir(), 'pv-agent-node-'));
    const index = new URL('../dist/index.js', import.meta.url).href;
    writeFileSync(
      join(dir, 'app.mjs'),
      `import http from 'node:http';
import { trace } from '${index}';
const server = http.createServer((req, res) => res.end(trace('render', () => 'hi')));
server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  await (await fetch('http://127.0.0.1:' + port + '/home')).text();
  server.close();
  setTimeout(() => { throw new Error('crash at the end'); }, 50);
});
`,
    );
    // Run the child asynchronously: a blocking spawn would also block the fake hub.
    const child = await new Promise<{ status: number | null; stderr: string }>((done) => {
      const p = spawn(process.execPath, ['--import', pathToFileURL(REGISTER).href, 'app.mjs'], {
        cwd: dir,
        env: { ...process.env, PV_RUNTIME_URL: `http://127.0.0.1:${port}`, PV_RUNTIME_TOKEN: 'tok', PV_PROJECT_ROOT: dir, PV_FLUSH_MS: '50' },
      });
      let stderr = '';
      p.stderr.on('data', (d) => (stderr += d));
      p.on('exit', (status) => done({ status, stderr }));
    });
    await new Promise((r) => setTimeout(r, 300));
    hub.close();
    expect(child.status).toBe(1); // still crashes like before
    expect(child.stderr).toContain('crash at the end');
    const events = bodies.flatMap((b) => b.body.events);
    expect(bodies.every((b) => b.auth === 'Bearer tok' && b.body.source.agent === 'node')).toBe(true);
    const kinds = events.map((e) => `${e.kind} ${e.name}`);
    expect(kinds).toContain('http_in GET /home');
    expect(kinds).toContain('call render');
    const crash = events.find((e) => e.kind === 'error')!;
    expect(crash.error?.message).toBe('crash at the end');
    expect(crash.file_path.toLowerCase()).toMatch(/app\.mjs$/);
    expect(crash.line).toBe(8);
  });
});
