// Test helper (not a handler): a fake MainContext that stores registered handlers in a map.
import type { MainContext } from './context';

export type FakeContext = MainContext & {
  handlers: Map<string, (payload: unknown) => unknown>;
  call: (channel: string, payload?: unknown) => Promise<unknown>;
  sent: Array<{ channel: string; payload: unknown }>;
};

export function fakeContext(parts: Partial<MainContext> = {}): FakeContext {
  const handlers = new Map<string, (payload: unknown) => unknown>();
  const sent: Array<{ channel: string; payload: unknown }> = [];
  const ctx = {
    handle: (channel: string, fn: (payload: unknown) => unknown) => {
      handlers.set(channel, fn);
    },
    send: (channel: string, payload: unknown) => {
      sent.push({ channel, payload });
    },
    getWindow: () => null,
    log: () => undefined,
    ...parts,
    handlers,
    sent,
    call: async (channel: string, payload?: unknown) => {
      const fn = handlers.get(channel);
      if (!fn) throw new Error(`no handler for ${channel}`);
      return fn(payload);
    },
  };
  return ctx as unknown as FakeContext;
}
