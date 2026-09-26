import { describe, expect, it } from 'vitest';
import { CloudClient, CloudError, type Tokens } from './cloud-client';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function setup(handler: Handler, tokens: Tokens | null = { access: 'a1', refresh: 'r1' }) {
  let saved = tokens;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = new CloudClient({
    baseUrl: () => 'https://pv.example/',
    getTokens: () => saved,
    setTokens: (t) => (saved = t),
    fetchImpl: (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    }) as unknown as typeof fetch,
  });
  return { client, calls, tokens: () => saved };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('CloudClient', () => {
  it('sends the access token and refreshes it once on 401', async () => {
    const { client, calls, tokens } = setup((url, init) => {
      if (url.endsWith('/api/auth/refresh')) return json(200, { access_token: 'a2', refresh_token: 'r2' });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer a2' ? json(200, { user: 'ana' }) : json(401, { error: { code: 'expired', message: 'expired' } });
    });
    expect(await client.request('GET', '/api/auth/me')).toEqual({ user: 'ana' });
    expect(calls.map((c) => c.url)).toEqual(['https://pv.example/api/auth/me', 'https://pv.example/api/auth/refresh', 'https://pv.example/api/auth/me']);
    expect(tokens()).toEqual({ access: 'a2', refresh: 'r2' });
  });

  it('clears the tokens when the refresh fails', async () => {
    const { client, tokens } = setup((url) => (url.endsWith('/refresh') ? json(401, {}) : json(401, {})));
    await expect(client.request('GET', '/api/auth/me')).rejects.toMatchObject({ code: 'signed_out' });
    expect(tokens()).toBeNull();
  });

  it('turns server errors into coded errors and needs sign-in for private calls', async () => {
    const { client } = setup(() => json(429, { error: { code: 'quota_exceeded', message: 'Daily limit reached' } }));
    await expect(client.request('POST', '/api/ai/qa/ask', {})).rejects.toEqual(new CloudError('Daily limit reached', 'quota_exceeded', 429));
    const out = setup(() => json(200, {}), null);
    await expect(out.client.request('GET', '/api/auth/me')).rejects.toMatchObject({ code: 'signed_out' });
    expect(out.calls).toHaveLength(0);
  });

  it('saves tokens on login', async () => {
    const { client, tokens } = setup(() => json(200, { access_token: 'x', refresh_token: 'y', user: {} }), null);
    await client.login('a@b.c', 'pw');
    expect(tokens()).toEqual({ access: 'x', refresh: 'y' });
  });

  it('reads a Server-Sent Events stream', async () => {
    const body = 'event: delta\ndata: {"text":"Hel"}\n\nevent: delta\r\ndata: {"text":"lo"}\r\n\r\nevent: done\ndata: {"markdown":"Hello"}\n\n';
    const { client, calls } = setup(() => new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    const events: Array<[string, unknown]> = [];
    await client.stream('/api/ai/stream/qa/ask', { q: 1 }, (e, d) => events.push([e, d]));
    expect(events).toEqual([
      ['delta', { text: 'Hel' }],
      ['delta', { text: 'lo' }],
      ['done', { markdown: 'Hello' }],
    ]);
    expect((calls[0].init.headers as Record<string, string>).Accept).toBe('text/event-stream');
  });

  it('rejects on an error event or an early end', async () => {
    const failing = setup(() => new Response('event: error\ndata: {"error":{"code":"provider_error","message":"down"}}\n\n'));
    await expect(failing.client.stream('/x', {}, () => undefined)).rejects.toMatchObject({ code: 'provider_error' });
    const cut = setup(() => new Response('event: delta\ndata: {"text":"a"}\n\n'));
    await expect(cut.client.stream('/x', {}, () => undefined)).rejects.toMatchObject({ code: 'stream_incomplete' });
  });
});
