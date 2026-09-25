import { describe, expect, it, vi } from 'vitest';
import type { BatchSource, RuntimeEventJson } from './batch';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Forwarder, MAX_QUEUE, normalizeRoot, sameFolderKey } from './forwarder';

const source = (project_root = ''): BatchSource => ({
  agent: 'python',
  version: '0.1.0',
  service: 's',
  project_root,
});
const events = (n: number, from = 0): RuntimeEventJson[] =>
  Array.from({ length: n }, (_, i) => ({
    v: 1,
    event_id: String(from + i),
    trace_id: 't',
    span_id: 's',
    kind: 'call',
    name: 'f',
    start_ns: 1,
  }));

function setup(request = vi.fn<(m: string, p: unknown) => Promise<unknown>>(async () => ({}))) {
  let tick: (() => void) | null = null;
  const clear = vi.fn();
  const forwarder = new Forwarder(
    { request },
    (fn, ms) => {
      expect(ms).toBe(200);
      tick = fn;
      return 'timer';
    },
    clear,
  );
  return { forwarder, request, clear, tick: () => tick!() };
}

describe('Forwarder', () => {
  it('drops events while no project is open', async () => {
    const { forwarder, request } = setup();
    forwarder.push(source(), events(3));
    await forwarder.tick();
    expect(request).not.toHaveBeenCalled();
    expect(forwarder.stats().dropped_no_project).toBe(3);
  });

  it('sends queued events in chunks of 500 on each tick', async () => {
    const { forwarder, request, tick } = setup();
    forwarder.setActiveProject('p1', 'C:\\work\\shop\\');
    forwarder.push(source('c:/work/shop'), events(1200));
    tick();
    await vi.waitFor(() => expect(forwarder.stats().forwarded).toBe(1200));
    expect(
      request.mock.calls.map((c) => [
        c[0],
        (c[1] as { project_id: string; events: unknown[] }).events.length,
      ]),
    ).toEqual([
      ['runtime.ingest', 500],
      ['runtime.ingest', 500],
      ['runtime.ingest', 200],
    ]);
    expect((request.mock.calls[0][1] as { project_id: string }).project_id).toBe('p1');
  });

  it('drops events from another project folder', async () => {
    const { forwarder, request } = setup();
    forwarder.setActiveProject('p1', 'C:/work/shop');
    forwarder.push(source('C:/work/other'), events(2));
    forwarder.push(source(''), events(1)); // unknown folder (e.g. OTLP) is accepted
    await forwarder.tick();
    expect(forwarder.stats()).toMatchObject({ dropped_other_root: 2, forwarded: 1 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('counts engine errors without throwing and keeps going', async () => {
    const request = vi.fn(async () => {
      throw new Error('engine not running');
    });
    const { forwarder } = setup(request);
    forwarder.setActiveProject('p1', null);
    forwarder.push(source(), events(600));
    await expect(forwarder.tick()).resolves.toBeUndefined();
    expect(forwarder.stats()).toMatchObject({ errors: 2, forwarded: 0 });
  });

  it('keeps at most 50,000 queued events and clears the queue when the project changes', async () => {
    const { forwarder, request, clear } = setup();
    forwarder.setActiveProject('p1', null);
    forwarder.push(source(), events(MAX_QUEUE));
    forwarder.push(source(), events(10, MAX_QUEUE));
    expect(forwarder.stats().dropped_overflow).toBe(10);
    forwarder.setActiveProject('p2', null);
    await forwarder.tick();
    expect(request).not.toHaveBeenCalled();
    forwarder.stop();
    expect(clear).toHaveBeenCalledWith('timer');
  });

  it('normalizes folders', () => {
    expect(normalizeRoot('C:\\A\\b\\', true)).toBe('c:/a/b');
    expect(normalizeRoot('/srv/App/', false)).toBe('/srv/App');
  });

  it('treats two spellings of the same folder as the same project', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv fwd-')); // may be a short name (SWAPNI~1) on Windows
    try {
      const long = realpathSync.native(dir);
      expect(sameFolderKey(dir)).toBe(sameFolderKey(long));
      const { forwarder } = setup();
      forwarder.setActiveProject('p1', dir);
      forwarder.push(source(long), events(2));
      await forwarder.tick();
      expect(forwarder.stats()).toMatchObject({ forwarded: 2, dropped_other_root: 0 });
      expect(sameFolderKey('Z:/not/here')).toBe(normalizeRoot('Z:/not/here'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
