import { CHANNEL_NOTIFICATION, CHANNEL_RPC, type Envelope, type PvBridge } from '../shared/bridge';

export interface IpcLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

export function createBridge(ipc: IpcLike): PvBridge {
  return {
    rpc(method, params) {
      return ipc.invoke(CHANNEL_RPC, { method, params }) as Promise<Envelope<unknown>>;
    },
    invoke(channel, payload) {
      if (!channel.startsWith('pv:')) {
        return Promise.resolve({ ok: false, error: { code: 'bad_channel', message: 'channel must start with pv:' } });
      }
      return ipc.invoke(channel, payload) as Promise<Envelope<unknown>>;
    },
    onNotification(cb) {
      const listener = (_event: unknown, msg: unknown) => {
        const m = msg as { method: string; params: unknown };
        cb(m.method, m.params);
      };
      ipc.on(CHANNEL_NOTIFICATION, listener);
      return () => ipc.removeListener(CHANNEL_NOTIFICATION, listener);
    },
    on(channel, cb) {
      if (!channel.startsWith('pv:')) throw new Error('channel must start with pv:');
      const listener = (_event: unknown, payload: unknown) => cb(payload);
      ipc.on(channel, listener);
      return () => ipc.removeListener(channel, listener);
    },
  };
}
