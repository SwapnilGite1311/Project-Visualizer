// Uncaught exceptions and unhandled promise rejections -> error events, sent before the process exits.
import type { Config } from './config.js';
import { currentSpan, projectFrame } from './context.js';
import { type Emit, errorInfo, makeEvent, nowNs } from './events.js';

export function installErrorHooks(config: Config, emit: Emit, flushSync: () => void): () => void {
  const reported = new WeakSet<object>();

  const report = (reason: unknown) => {
    if (typeof reason === 'object' && reason !== null) {
      if (reported.has(reason)) return;
      reported.add(reason);
    }
    const info = errorInfo(reason);
    const frame = projectFrame(info.stack, config.projectRoot);
    const span = currentSpan();
    emit(
      makeEvent(config, 'error', info.type, {
        trace_id: span?.traceId,
        parent_span_id: span?.spanId ?? null,
        file_path: frame?.file ?? '',
        line: frame?.line ?? 0,
        start_ns: nowNs(),
        status: 'error',
        error: info,
      }),
    );
  };

  // "Monitor" only watches: Node still prints the error and exits as usual (or runs the app's own handler).
  const onUncaught = (error: unknown) => {
    report(error);
    flushSync();
  };
  // A listener here would stop Node from crashing on unhandled rejections, so when it is the only one,
  // it re-throws to keep Node's default behaviour.
  const onRejection = (reason: unknown) => {
    report(reason);
    if (process.listenerCount('unhandledRejection') === 1) throw reason;
  };
  const onExit = () => flushSync(); // process.exit(): async sends would never finish

  process.on('uncaughtExceptionMonitor', onUncaught);
  process.on('unhandledRejection', onRejection);
  process.on('exit', onExit);
  return () => {
    process.off('uncaughtExceptionMonitor', onUncaught);
    process.off('unhandledRejection', onRejection);
    process.off('exit', onExit);
  };
}
