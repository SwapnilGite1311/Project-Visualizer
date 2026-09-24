import { describe, expect, it, vi } from 'vitest';
import { provider } from './index';

const req = { system: 'sys', messages: [{ role: 'user' as const, content: 'hi' }], maxTokens: 50 };

function okResponse(): Response {
  return new Response(
    JSON.stringify({
      model: 'llama3.1',
      choices: [{ message: { content: 'Answer' } }],
      usage: { prompt_tokens: 9, completion_tokens: 2 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('openai-compatible provider', () => {
  it('posts chat completions without auth when the key is empty', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const res = await provider
      .create({ model: 'llama3.1', baseUrl: 'http://localhost:11434/v1', apiKey: '' }, fetchImpl as unknown as typeof fetch)
      .complete(req);
    expect(res).toEqual({ text: 'Answer', model: 'llama3.1', inputTokens: 9, outputTokens: 2 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.headers).not.toHaveProperty('authorization');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'llama3.1',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      max_tokens: 50,
      temperature: 0.2,
    });
  });

  it('adds a bearer token when a key is set', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    await provider
      .create({ model: 'gpt-x', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-1' }, fetchImpl as unknown as typeof fetch)
      .complete(req);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: 'Bearer sk-1' });
  });

  it('requires a model name', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    await expect(
      provider.create({ model: '', baseUrl: 'x', apiKey: '' }, fetchImpl as unknown as typeof fetch).complete(req),
    ).rejects.toMatchObject({ code: 'provider_error' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
