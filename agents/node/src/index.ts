// Project Visualizer runtime agent for Node.js: start() once, or `node --import @pv/agent-node/register app.js`.
import { type Config, loadConfig } from './config.js';
import { installErrorHooks } from './errors.js';
import { instrumentHttp } from './http.js';
import { setTraceTarget } from './trace.js';
import { Transport } from './transport.js';

export { trace } from './trace.js';
export type { Config } from './config.js';

let running: { transport: Transport; stopHttp: () => void; stopErrors: () => void } | null = null;

/** Starts recording; false (with a warning) when PV_RUNTIME_TOKEN is not set. Calling it twice is harmless. */
export function start(config: Config | null = loadConfig()): boolean {
  if (running) return true;
  if (!config) {
    process.stderr.write('pv-agent: PV_RUNTIME_TOKEN is not set; runtime recording is off.\n');
    return false;
  }
  const transport = new Transport(config);
  const emit = transport.emit.bind(transport);
  running = {
    transport,
    stopHttp: instrumentHttp(config, emit),
    stopErrors: installErrorHooks(config, emit, () => transport.flushSync()),
  };
  setTraceTarget({ config, emit });
  process.once('beforeExit', () => void transport.flush());
  return true;
}

/** Stops recording and sends what is left. */
export async function stop(): Promise<void> {
  if (!running) return;
  const { transport, stopHttp, stopErrors } = running;
  running = null;
  setTraceTarget(null);
  stopHttp();
  stopErrors();
  await transport.close();
}
