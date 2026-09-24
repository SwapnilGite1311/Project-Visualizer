import { AiError } from './types';

// Shared POST + error mapping for all HTTP providers.
export async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new AiError('network', 'Could not reach the AI provider');
  }
  if (res.status === 401 || res.status === 403) throw new AiError('auth', 'The API key was rejected');
  if (res.status === 429) throw new AiError('rate_limit', 'Too many requests; try again shortly');
  if (!res.ok) throw new AiError('provider_error', `AI provider error ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}
