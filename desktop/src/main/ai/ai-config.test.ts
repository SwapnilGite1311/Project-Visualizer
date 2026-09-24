import { describe, expect, it } from 'vitest';
import { provider as anthropic } from '../ai-providers/anthropic';
import { provider as openai } from '../ai-providers/openai';
import { readAiConfig } from './ai-config';

function settings(values: Record<string, unknown>) {
  return { get: <T>(k: string, f: T): T => (k in values ? (values[k] as T) : f) };
}
function secrets(values: Record<string, string>) {
  return { get: (n: string) => values[n] ?? null };
}
const providers = [anthropic, openai];

describe('readAiConfig', () => {
  it('uses anthropic defaults with a key', () => {
    const { factory, config } = readAiConfig(settings({}), secrets({ 'ai.apiKey.anthropic': 'sk-a' }), providers);
    expect(factory.id).toBe('anthropic');
    expect(config).toEqual({ model: 'claude-haiku-4-5-20251001', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-a' });
  });

  it('requires a key for anthropic', () => {
    expect(() => readAiConfig(settings({}), secrets({}), providers)).toThrow('Add an API key in Settings → AI');
  });

  it('allows openai-compatible providers without a key and uses custom values', () => {
    const { config } = readAiConfig(
      settings({ 'ai.provider': 'openai', 'ai.model.openai': 'llama3.1', 'ai.baseUrl.openai': 'http://localhost:11434/v1' }),
      secrets({}),
      providers,
    );
    expect(config).toEqual({ model: 'llama3.1', baseUrl: 'http://localhost:11434/v1', apiKey: '' });
  });

  it('rejects an unknown provider', () => {
    expect(() => readAiConfig(settings({ 'ai.provider': 'mystery' }), secrets({}), providers)).toThrow(
      'Unknown AI provider: mystery',
    );
  });
});
