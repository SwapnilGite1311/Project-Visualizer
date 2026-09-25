// Sends events to the desktop runtime hub in the background, without ever throwing into the app.
import { execFileSync } from 'node:child_process';
import type { Config } from './config.js';
import type { RuntimeEvent } from './events.js';

export const BATCH = 1000;
const VERSION = '0.1.0';

type Sender = (body: string) => Promise<void>;

function httpSender(config: Config): Sender {
  return async (body) => {
    const res = await fetch(config.url + '/v1/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + config.token },
      body,
      signal: AbortSignal.timeout(2000),
    });
    await res.arrayBuffer();
    if (!res.ok) throw new Error(`hub answered ${res.status}`);
  };
}

// Used when the process is about to exit (crash, process.exit): an async request would never finish,
// so a short-lived child process posts the batch while this one waits (at most 2 s).
const SYNC_POST = `
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  try {
    await fetch(process.env.PV_SYNC_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.PV_SYNC_TOKEN }, body: Buffer.concat(chunks), signal: AbortSignal.timeout(1800) });
  } catch {}
});`;

export class Transport {
  readonly source: { agent: string; version: string; service: string; project_root: string };
  private queue: RuntimeEvent[] = [];
  private readonly timer: NodeJS.Timeout;
  private readonly send: Sender;
  private sending: Promise<void> | null = null;
  private closed = false;
  dropped = 0;
  failed = 0;
  sent = 0;

  constructor(
    private readonly config: Config,
    send?: Sender,
  ) {
    this.send = send ?? httpSender(config);
    this.source = { agent: 'node', version: VERSION, service: config.service, project_root: config.projectRoot };
    this.timer = setInterval(() => void this.flush(), config.flushMs);
    this.timer.unref();
  }

  emit(event: RuntimeEvent): void {
    if (this.closed) return;
    this.queue.push(event);
    if (this.queue.length > this.config.maxQueue) {
      this.queue.splice(0, this.queue.length - this.config.maxQueue); // oldest first
      this.dropped++;
    }
  }

  /** Sends everything queued now; resolves when done. Never rejects. */
  flush(): Promise<void> {
    if (this.sending) return this.sending.then(() => (this.queue.length > 0 ? this.flush() : undefined));
    if (this.queue.length === 0) return Promise.resolve();
    this.sending = (async () => {
      while (this.queue.length > 0) {
        const events = this.queue.splice(0, BATCH);
        try {
          await this.send(this.body(events));
          this.sent += events.length;
        } catch {
          this.failed++; // the batch is dropped; the app must never notice
        }
      }
    })().finally(() => {
      this.sending = null;
    });
    return this.sending;
  }

  /** Last resort before the process exits: blocks until the queue is posted (or 2 s pass). */
  flushSync(): void {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0, this.queue.length);
    for (let i = 0; i < events.length; i += BATCH) {
      try {
        execFileSync(process.execPath, ['-e', SYNC_POST], {
          input: this.body(events.slice(i, i + BATCH)),
          env: { ...process.env, PV_SYNC_URL: this.config.url + '/v1/events', PV_SYNC_TOKEN: this.config.token, NODE_OPTIONS: '' },
          timeout: 2000,
          stdio: ['pipe', 'ignore', 'ignore'],
          windowsHide: true,
        });
        this.sent += Math.min(BATCH, events.length - i);
      } catch {
        this.failed++;
      }
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    await this.flush();
  }

  private body(events: RuntimeEvent[]): string {
    return JSON.stringify({ source: this.source, events });
  }
}
