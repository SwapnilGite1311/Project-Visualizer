// The local endpoint runtime agents send to (SEC-05: 127.0.0.1 only, Bearer token required).
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type BatchSource, BatchError, type RuntimeEventJson, validateBatch } from './batch';
import { otlpToEvents } from './otlp';

export const DEFAULT_HUB_PORT = 47100;
export const MAX_BODY_BYTES = 5 * 1024 * 1024;
const EXTRA_PORTS = 9; // 47100 busy → try up to 47109

const OTLP_SOURCE: BatchSource = { agent: 'otlp', version: '', service: 'otlp', project_root: '' };

interface Options {
  token(): string;
  onEvents(source: BatchSource, events: RuntimeEventJson[]): void;
  port?: number;
}

export interface HubStats {
  received: number;
  rejected: number;
  unauthorized: number;
}

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function reply(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

export class HubServer {
  private server: Server | null = null;
  private port: number | null = null;
  private readonly counts: HubStats = { received: 0, rejected: 0, unauthorized: 0 };

  constructor(private readonly opts: Options) {}

  async start(): Promise<number> {
    const preferred = this.opts.port ?? DEFAULT_HUB_PORT;
    const last = preferred === 0 ? 0 : preferred + EXTRA_PORTS;
    for (let port = preferred; port <= last; port++) {
      try {
        this.server = await this.listen(port);
        const address = this.server.address();
        this.port = typeof address === 'object' && address ? address.port : port;
        return this.port;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || port === last) throw e;
      }
    }
    throw new Error('no free port for the runtime hub');
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    this.port = null;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  stats(): HubStats {
    return { ...this.counts };
  }

  status(): { running: boolean; port: number | null } {
    return { running: this.server !== null, port: this.port };
  }

  private listen(port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => this.route(req, res));
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve(server);
      });
    });
  }

  private route(req: IncomingMessage, res: ServerResponse): void {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method === 'GET' && path === '/healthz') {
      req.resume();
      reply(res, 200, { ok: true });
      return;
    }
    if (req.method !== 'POST' || (path !== '/v1/events' && path !== '/v1/traces')) {
      req.resume();
      reply(res, 404, { error: 'not found' });
      return;
    }
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ') || !sameToken(auth.slice(7).trim(), this.opts.token())) {
      this.counts.unauthorized++;
      req.resume();
      reply(res, 401, { error: 'missing or wrong token' });
      return;
    }
    this.readBody(req, (body) => {
      if (body === null) {
        reply(res, 413, { error: `the body is larger than ${MAX_BODY_BYTES} bytes` });
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(body.toString('utf8'));
      } catch {
        reply(res, 400, { error: 'the body is not JSON' });
        return;
      }
      try {
        const { source, events, rejected } =
          path === '/v1/events'
            ? validateBatch(json)
            : { source: OTLP_SOURCE, events: otlpToEvents(json, 'otlp'), rejected: 0 };
        this.counts.received += events.length;
        this.counts.rejected += rejected;
        if (events.length > 0) this.opts.onEvents(source, events);
        reply(res, 200, { accepted: events.length, rejected });
      } catch (e) {
        if (e instanceof BatchError) reply(res, 400, { error: e.message });
        else reply(res, 500, { error: 'internal error' });
      }
    });
  }

  // Calls back with the body, or null when it is too large (the rest is read and thrown away).
  private readBody(req: IncomingMessage, done: (body: Buffer | null) => void): void {
    const declared = Number(req.headers['content-length'] ?? 0);
    let tooLarge = declared > MAX_BODY_BYTES;
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
      } else chunks.push(chunk);
    });
    req.on('end', () => done(tooLarge ? null : Buffer.concat(chunks)));
    req.on('error', () => done(null));
  }
}
