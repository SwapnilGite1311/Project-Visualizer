import { describe, expect, it, vi } from 'vitest';
import { provider } from './index';

const req = { system: 'sys', messages: [{ role: 'user' as const, content: 'hi' }], maxTokens: 100 };
const config = { model: 'claude-haiku-4-5-20251001', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-test' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('anthropic provider', () => {
  it('sends the Messages API request and parses the answer', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        model: 'claude-haiku-4-5-20251001',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'tool_use' },
          { type: 'text', text: 'world' },
        ],
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
    );
    const res = await provider.create(config, fetchImpl as unknown as typeof fetch).complete(req);
    expect(res).toEqual({ text: 'Hello world', model: 'claude-haiku-4-5-20251001', inputTokens: 12, outputTokens: 3 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers).toMatchObject({ 'x-api-key': 'sk-test', 'anthropic-version': '2023-06-01' });
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
    });
  });

  it('maps 401 to auth and network failures to network', async () => {
    const unauthorized = vi.fn(async () => jsonResponse(401, {}));
    await expect(provider.create(config, unauthorized as unknown as typeof fetch).complete(req)).rejects.toMatchObject({
      code: 'auth',
    });
    const offline = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(provider.create(config, offline as unknown as typeof fetch).complete(req)).rejects.toMatchObject({
      code: 'network',
    });
  });
});
