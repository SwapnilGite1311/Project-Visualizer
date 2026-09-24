import { describe, expect, it, vi } from 'vitest';
import type { EngineTransport } from './engine-client';
import type { EngineProcessHandle, Spawner } from './engine-process';
import { EngineService, type EngineStatus } from './engine-service';
import { encodeMessage, FrameDecoder } from './framing';

class FakeEngine implements EngineProcessHandle {
  private dataCb: ((chunk: Buffer) => void) | null = null;
  private readonly exitCbs: Array<(code: number | null) => void> = [];
  private readonly decoder = new FrameDecoder();
  transport: EngineTransport = {
    write: (data) => {
      for (const text of this.decoder.push(data)) {
        const req = JSON.parse(text);
        queueMicrotask(() => {
          this.send({ jsonrpc: '2.0', id: req.id, result: { method: req.method } });
          if (req.method === 'engine.shutdown') this.crash();
        });
      }
    },
    onData: (cb) => {
      this.dataCb = cb;
    },
  };
  send(obj: unknown): void {
    this.dataCb?.(encodeMessage(JSON.stringify(obj)));
  }
  onExit(cb: (code: number | null) => void): void {
    this.exitCbs.push(cb);
  }
  kill(): void {
    this.crash();
  }
  crash(): void {
    for (const cb of this.exitCbs.splice(0)) cb(1);
  }
}

function setup() {
  const engines: FakeEngine[] = [];
  const spawner: Spawner = () => {
    const e = new FakeEngine();
    engines.push(e);
    return e;
  };
  let clock = 0;
  const service = new EngineService('pv-engine', spawner, () => clock);
  const statuses: EngineStatus[] = [];
  service.onStatus((s) => statuses.push(s));
  return { service, engines, statuses, advance: (ms: number) => (clock += ms) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('EngineService', () => {
  it('starts and becomes ready', async () => {
    const { service } = setup();
    await service.start();
    expect(service.status).toBe('ready');
    expect(service.path).toBe('pv-engine');
    await expect(service.request('graph.node')).resolves.toEqual({ method: 'graph.node' });
  });

  it('restarts after a crash', async () => {
    const { service, engines, statuses } = setup();
    await service.start();
    statuses.length = 0;
    engines[0].crash();
    await flush();
    await flush();
    expect(statuses).toEqual(['crashed', 'restarting', 'starting', 'ready']);
    expect(service.status).toBe('ready');
  });

  it('gives up after 3 restarts within 60 seconds', async () => {
    const { service, engines } = setup();
    await service.start();
    for (let i = 0; i < 4; i++) {
      engines[engines.length - 1].crash();
      await flush();
      await flush();
    }
    expect(service.status).toBe('crashed');
    expect(engines.length).toBe(4);
  });

  it('rejects requests while stopped', async () => {
    const { service } = setup();
    await expect(service.request('engine.ping')).rejects.toThrow('engine not running');
  });

  it('delivers notifications after a restart', async () => {
    const { service, engines } = setup();
    const listener = vi.fn();
    service.onNotification(listener);
    await service.start();
    engines[0].send({ jsonrpc: '2.0', method: 'project.progress', params: { n: 1 } });
    engines[0].crash();
    await flush();
    await flush();
    engines[1].send({ jsonrpc: '2.0', method: 'project.progress', params: { n: 2 } });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith('project.progress', { n: 2 });
  });

  it('stops cleanly', async () => {
    const { service } = setup();
    await service.start();
    await service.stop();
    expect(service.status).toBe('stopped');
  });
});
