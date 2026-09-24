import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFn = (level: LogLevel, msg: string, extra?: unknown) => void;

export function createLogger(filePath: string | null): LogFn {
  return (level, msg, extra) => {
    let line = `${new Date().toISOString()} ${level.toUpperCase()} ${msg}`;
    if (extra !== undefined) line += ` ${JSON.stringify(extra)}`;
    if (level === 'info') console.log(line);
    else if (level === 'warn') console.warn(line);
    else console.error(line);
    if (!filePath) return;
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      appendFileSync(filePath, `${line}\n`, 'utf8');
    } catch {
      // Logging must never crash the app.
    }
  };
}
