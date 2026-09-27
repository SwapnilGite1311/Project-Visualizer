import { describe, expect, it } from 'vitest';
import { loadConfig, newId, type SafeParser } from './index';

interface Conf {
  port: number;
}
const schema: SafeParser<Conf> = {
  safeParse(v) {
    const env = v as Record<string, string | undefined>;
    const port = Number(env.PORT);
    if (!env.PORT || Number.isNaN(port)) return { success: false, error: { issues: [{ path: ['PORT'], message: 'Required number' }] } };
    return { success: true, data: { port } };
  },
};

describe('config', () => {
  it('returns the parsed values', () => {
    expect(loadConfig(schema, { PORT: '8101' })).toEqual({ port: 8101 });
  });

  it('names every invalid variable', () => {
    expect(() => loadConfig(schema, {})).toThrow('Invalid configuration: PORT: Required number');
  });

  it('makes unique ids', () => {
    const a = newId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(newId()).not.toBe(a);
  });
});
