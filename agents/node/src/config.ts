// Agent settings from environment variables (the same ones as the Python agent).
import { basename, resolve } from 'node:path';

export interface Config {
  url: string;
  token: string;
  projectRoot: string;
  service: string;
  sampleRate: number;
  stallMs: number;
  maxQueue: number;
  flushMs: number;
}

function num(env: NodeJS.ProcessEnv, key: string, fallback: number, low: number, high = Number.POSITIVE_INFINITY, integer = true): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < low || value > high || (integer && !Number.isInteger(value))) return fallback;
  return value;
}

/** null when PV_RUNTIME_TOKEN is missing (the agent then stays off). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config | null {
  const token = env.PV_RUNTIME_TOKEN ?? '';
  if (!token) return null;
  const script = process.argv[1];
  return {
    url: (env.PV_RUNTIME_URL || 'http://127.0.0.1:47100').replace(/\/+$/, ''),
    token,
    projectRoot: resolve(env.PV_PROJECT_ROOT || process.cwd()).replace(/\\/g, '/'),
    service: env.PV_SERVICE || (script ? basename(script) : 'node'),
    sampleRate: num(env, 'PV_SAMPLE_RATE', 1, 0, 1, false),
    stallMs: num(env, 'PV_STALL_MS', 5000, 1),
    maxQueue: num(env, 'PV_MAX_QUEUE', 20000, 1),
    flushMs: num(env, 'PV_FLUSH_MS', 200, 1),
  };
}
