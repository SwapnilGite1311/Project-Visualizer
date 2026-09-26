// The desktop's only way to the server (R13): JSON over HTTPS with automatic token refresh, plus Server-Sent Events
// for streamed AI answers (R11).

export interface Tokens {
  access: string;
  refresh: string;
}

export interface CloudClientDeps {
  baseUrl(): string;
  getTokens(): Tokens | null;
  setTokens(t: Tokens | null): void;
  fetchImpl?: typeof fetch;
}

export class CloudError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'CloudError';
  }
}

type Json = Record<string, unknown>;

export class CloudClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly deps: CloudClientDeps) {
    this.fetchImpl = deps.fetchImpl ?? ((...args) => fetch(...args));
  }

  signedIn(): boolean {
    return this.deps.getTokens() !== null;
  }

  async request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
    const res = await this.send(method, path, body, opts.auth ?? true, 'application/json');
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // POSTs and reads a text/event-stream answer: `delta` events go to onEvent, the stream ends at `done`
  // (resolves) or `error` (rejects with its code).
  async stream(path: string, body: unknown, onEvent: (event: string, data: unknown) => void): Promise<void> {
    const res = await this.send('POST', path, body, true, 'text/event-stream');
    if (!res.body) throw new CloudError('empty answer', 'bad_response', res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, '');
        const parsed = parseEvent(block);
        if (!parsed) continue;
        if (parsed.event === 'error') {
          const err = (parsed.data as { error?: { code?: string; message?: string } })?.error ?? {};
          throw new CloudError(err.message ?? 'stream failed', err.code ?? 'stream_error', res.status);
        }
        onEvent(parsed.event, parsed.data);
        if (parsed.event === 'done') {
          await reader.cancel().catch(() => undefined);
          return;
        }
      }
      if (done) throw new CloudError('the answer ended too early', 'stream_incomplete', res.status);
    }
  }

  // --- convenience methods (auth, teams, sync)
  async register(email: string, password: string, displayName: string): Promise<Json> {
    return this.saveTokens(await this.request<Json>('POST', '/api/auth/register', { email, password, display_name: displayName }, { auth: false }));
  }
  async login(email: string, password: string): Promise<Json> {
    return this.saveTokens(await this.request<Json>('POST', '/api/auth/login', { email, password }, { auth: false }));
  }
  async exchange(code: string): Promise<Json> {
    return this.saveTokens(await this.request<Json>('POST', '/api/auth/github/exchange', { code }, { auth: false }));
  }
  async logout(): Promise<void> {
    const tokens = this.deps.getTokens();
    this.deps.setTokens(null);
    if (tokens) await this.request('POST', '/api/auth/logout', { refresh_token: tokens.refresh }, { auth: false }).catch(() => undefined);
  }
  me = () => this.request<Json>('GET', '/api/auth/me');
  listOrgs = () => this.request<Json>('GET', '/api/projects/orgs');
  createOrg = (name: string) => this.request<Json>('POST', '/api/projects/orgs', { name });
  listProjects = (orgId: string) => this.request<Json>('GET', `/api/projects/orgs/${encodeURIComponent(orgId)}/projects`);
  createProject = (orgId: string, name: string) => this.request<Json>('POST', `/api/projects/orgs/${encodeURIComponent(orgId)}/projects`, { name });
  uploadSnapshot = (projectId: string, label: string, snapshot: unknown) =>
    this.request<Json>('POST', `/api/sync/projects/${encodeURIComponent(projectId)}/snapshots`, { label, snapshot });
  listSnapshots = (projectId: string) => this.request<Json>('GET', `/api/sync/projects/${encodeURIComponent(projectId)}/snapshots`);
  getSnapshot = (id: string) => this.request<Json>('GET', `/api/sync/snapshots/${encodeURIComponent(id)}`);

  private saveTokens(answer: Json): Json {
    const access = answer.access_token;
    const refresh = answer.refresh_token;
    if (typeof access === 'string' && typeof refresh === 'string') this.deps.setTokens({ access, refresh });
    return answer;
  }

  private url(path: string): string {
    return this.deps.baseUrl().replace(/\/+$/, '') + path;
  }

  private async send(method: string, path: string, body: unknown, auth: boolean, accept: string): Promise<Response> {
    const attempt = async () => {
      const headers: Record<string, string> = { Accept: accept };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const tokens = auth ? this.deps.getTokens() : null;
      if (auth && !tokens) throw new CloudError('Please sign in first', 'signed_out', 401);
      if (tokens) headers.Authorization = `Bearer ${tokens.access}`;
      try {
        return await this.fetchImpl(this.url(path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (e) {
        throw new CloudError(`Cannot reach the server: ${e instanceof Error ? e.message : String(e)}`, 'network');
      }
    };
    let res = await attempt();
    if (res.status === 401 && auth) {
      await this.refresh();
      res = await attempt();
    }
    if (!res.ok) throw await errorFrom(res);
    return res;
  }

  private async refresh(): Promise<void> {
    const tokens = this.deps.getTokens();
    if (!tokens) throw new CloudError('Please sign in again', 'signed_out', 401);
    let res: Response;
    try {
      res = await this.fetchImpl(this.url('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refresh }),
      });
    } catch (e) {
      throw new CloudError(`Cannot reach the server: ${e instanceof Error ? e.message : String(e)}`, 'network');
    }
    if (!res.ok) {
      this.deps.setTokens(null);
      throw new CloudError('Please sign in again', 'signed_out', 401);
    }
    const answer = (await res.json()) as Json;
    if (typeof answer.access_token !== 'string' || typeof answer.refresh_token !== 'string') {
      this.deps.setTokens(null);
      throw new CloudError('Please sign in again', 'signed_out', 401);
    }
    this.deps.setTokens({ access: answer.access_token, refresh: answer.refresh_token });
  }
}

function parseEvent(block: string): { event: string; data: unknown } | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (data.length === 0) return null;
  const text = data.join('\n');
  try {
    return { event, data: JSON.parse(text) };
  } catch {
    return { event, data: text };
  }
}

async function errorFrom(res: Response): Promise<CloudError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new CloudError(body.error?.message ?? `HTTP ${res.status}`, body.error?.code ?? `http_${res.status}`, res.status);
  } catch {
    return new CloudError(`HTTP ${res.status}`, `http_${res.status}`, res.status);
  }
}
