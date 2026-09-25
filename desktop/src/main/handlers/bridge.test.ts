import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from 'electron';
import { removeBridgeInfo, writeBridgeInfo } from '../bridge/bridge-info';
import { BridgeServer } from '../bridge/bridge-server';
import { fakeContext } from '../core/test-context';
import register from './bridge';

vi.mock('electron', () => ({ app: { getVersion: () => '0.1.0', on: vi.fn() } }));
vi.mock('../bridge/bridge-info', () => ({ generateToken: () => 'new-token', writeBridgeInfo: vi.fn(), removeBridgeInfo: vi.fn() }));
vi.mock('../bridge/bridge-server', () => ({ BridgeServer: vi.fn() }));

const server = {
  start: vi.fn(async () => 47101),
  stop: vi.fn(async () => undefined),
  status: vi.fn(() => ({ running: true, port: 47101, clients: 1 })),
  broadcastOpen: vi.fn(() => 1),
};

function setup(stored = '') {
  const settings = { get: vi.fn((_k: string, f: unknown) => stored || f), set: vi.fn() };
  const ctx = fakeContext({ settings } as never);
  register(ctx);
  return { ctx, settings };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(BridgeServer).mockImplementation(function () {
    return server;
  } as never);
});

describe('bridge handler', () => {
  it('creates and saves a token, starts the server and writes the info file', async () => {
    const { settings } = setup();
    expect(settings.set).toHaveBeenCalledWith('bridge.token', 'new-token');
    expect(vi.mocked(BridgeServer).mock.calls[0][0]).toMatchObject({ token: 'new-token', appVersion: '0.1.0' });
    await vi.waitFor(() => expect(writeBridgeInfo).toHaveBeenCalledWith({ port: 47101, token: 'new-token', pid: process.pid }));
  });

  it('reuses a stored token and forwards requests to the renderer', () => {
    const { ctx, settings } = setup('stored');
    expect(settings.set).not.toHaveBeenCalled();
    const opts = vi.mocked(BridgeServer).mock.calls[0][0];
    opts.onReveal('C:/p/a.py', 9);
    opts.onExplain('C:/p/a.py', 4);
    expect(ctx.sent).toEqual([
      { channel: 'pv:bridge.reveal', payload: { file_path: 'C:/p/a.py', line: 9 } },
      { channel: 'pv:bridge.explain', payload: { file_path: 'C:/p/a.py', line: 4 } },
    ]);
  });

  it('reports status, opens files in the IDE and cleans up on quit', async () => {
    const { ctx } = setup('stored');
    expect(await ctx.call('pv:bridge.status')).toEqual({ running: true, port: 47101, clients: 1 });
    expect(await ctx.call('pv:bridge.openInIde', { file_path: 'C:/p/a.py', line: 4 })).toEqual({ sent: true });
    expect(server.broadcastOpen).toHaveBeenCalledWith('C:/p/a.py', 4);
    await expect(ctx.call('pv:bridge.openInIde', {})).rejects.toThrow('file_path is required');
    const calls = vi.mocked(app.on).mock.calls as unknown as Array<[string, () => void]>;
    const onQuit = calls.find((c) => c[0] === 'before-quit')![1];
    onQuit();
    expect(removeBridgeInfo).toHaveBeenCalled();
    expect(server.stop).toHaveBeenCalled();
  });
});
