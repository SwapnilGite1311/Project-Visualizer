import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from 'electron';
import { fakeContext } from '../core/test-context';
import { Forwarder } from '../runtime/forwarder';
import { HubServer } from '../runtime/hub-server';
import register from './runtime';

vi.mock('electron', () => ({ app: { on: vi.fn() } }));
vi.mock('../runtime/hub-server', () => ({ HubServer: vi.fn() }));
vi.mock('../runtime/forwarder', () => ({ Forwarder: vi.fn() }));

const server = {
  start: vi.fn(async () => 47100),
  stop: vi.fn(async () => undefined),
  status: vi.fn(() => ({ running: true, port: 47100 })),
  stats: vi.fn(() => ({ received: 5, rejected: 1, unauthorized: 0 })),
};
const forwarder = {
  push: vi.fn(),
  setActiveProject: vi.fn(),
  stop: vi.fn(),
  stats: vi.fn(() => ({
    forwarded: 4,
    dropped_no_project: 1,
    dropped_other_root: 0,
    dropped_overflow: 0,
    errors: 0,
  })),
};

function setup(stored = '') {
  const settings = { get: vi.fn((_k: string, f: unknown) => stored || f), set: vi.fn() };
  const engine = { request: vi.fn() };
  const ctx = fakeContext({ settings, engine } as never);
  register(ctx);
  return { ctx, settings, engine };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(HubServer).mockImplementation(function () {
    return server;
  } as never);
  vi.mocked(Forwarder).mockImplementation(function () {
    return forwarder;
  } as never);
});

describe('runtime handler', () => {
  it('creates a token, starts the hub and forwards its events', () => {
    const { settings, engine } = setup();
    const [[key, token]] = settings.set.mock.calls as Array<[string, string]>;
    expect(key).toBe('runtime.token');
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(vi.mocked(Forwarder).mock.calls[0][0]).toBe(engine);
    expect(server.start).toHaveBeenCalled();
    const opts = vi.mocked(HubServer).mock.calls[0][0];
    expect(opts.token()).toBe(token);
    const src = { agent: 'python', version: '', service: '', project_root: '' };
    opts.onEvents(src, []);
    expect(forwarder.push).toHaveBeenCalledWith(src, []);
  });

  it('reports hub info and sets the active project', async () => {
    const { ctx, settings } = setup('stored-token');
    expect(settings.set).not.toHaveBeenCalled();
    expect(await ctx.call('pv:runtime.hubInfo')).toEqual({
      url: 'http://127.0.0.1:47100',
      token: 'stored-token',
      running: true,
      port: 47100,
      received: 5,
      rejected: 1,
      unauthorized: 0,
      forwarded: 4,
      dropped_no_project: 1,
      dropped_other_root: 0,
      dropped_overflow: 0,
      errors: 0,
    });
    await ctx.call('pv:runtime.setActiveProject', { project_id: 'p1', root: 'C:/shop' });
    await ctx.call('pv:runtime.setActiveProject', { project_id: null, root: null });
    expect(forwarder.setActiveProject.mock.calls).toEqual([
      ['p1', 'C:/shop'],
      [null, null],
    ]);
  });

  it('regenerates the token, which the hub then requires, and stops on quit', async () => {
    const { ctx, settings } = setup('old');
    const { token } = (await ctx.call('pv:runtime.regenerateToken')) as { token: string };
    expect(token).not.toBe('old');
    expect(settings.set).toHaveBeenCalledWith('runtime.token', token);
    expect(vi.mocked(HubServer).mock.calls[0][0].token()).toBe(token);
    const calls = vi.mocked(app.on).mock.calls as unknown as Array<[string, () => void]>;
    calls.find((c) => c[0] === 'before-quit')![1]();
    expect(forwarder.stop).toHaveBeenCalled();
    expect(server.stop).toHaveBeenCalled();
  });
});
