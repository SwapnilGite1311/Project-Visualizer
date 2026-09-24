import { describe, expect, it } from 'vitest';
import { AiService } from './ai-service';
import type { AiProviderFactory, AiRequest } from './types';

const pack = {
  node: { id: 'function:app/utils.py#is_valid', kind: 'function', name: 'is_valid', file_path: 'app/utils.py' },
  parent: { id: 'module:app/utils.py', kind: 'module', name: 'utils.py' },
  children: [],
  callers: [{ id: 'method:app/services.py#UserService.get_user', kind: 'method', name: 'get_user', file_path: 'app/services.py' }],
  callees: [],
  imports: [],
};

function fakeEngine() {
  return {
    request: async <T,>(method: string): Promise<T> => {
      if (method === 'context.for_node') return pack as T;
      if (method === 'project.status') return { root_path: 'C:/code/demo' } as T;
      throw new Error(`unexpected ${method}`);
    },
  };
}

function fakeProvider(answer: string, seen: AiRequest[]): AiProviderFactory {
  return {
    id: 'anthropic',
    label: 'fake',
    needsApiKey: true,
    defaultModel: 'fake-model',
    defaultBaseUrl: 'http://fake',
    create: () => ({
      id: 'anthropic',
      complete: async (req) => {
        seen.push(req);
        return { text: answer, model: 'fake-model' };
      },
    }),
  };
}

const settings = (values: Record<string, unknown> = {}) => ({
  get: <T,>(k: string, f: T): T => (k in values ? (values[k] as T) : f),
});
const secrets = (key: string | null) => ({ get: () => key });

describe('AiService.explainNode', () => {
  it('renders the prompt from the context pack and cleans citations', async () => {
    const seen: AiRequest[] = [];
    const answer =
      '**Summary:** checks ids. Used by get_user [[node:method:app/services.py#UserService.get_user]] and Ghost [[node:function:x.py#ghost]].';
    const service = new AiService({
      engine: fakeEngine(),
      settings: settings({ 'project.notes.C:/code/demo': 'Demo notes' }),
      secrets: secrets('sk-1'),
      providers: [fakeProvider(answer, seen)],
    });
    const result = await service.explainNode('p1', 'function:app/utils.py#is_valid');
    expect(result.markdown).not.toContain('ghost');
    expect(result.markdown).toContain('[[node:method:app/services.py#UserService.get_user]]');
    expect(result.cited_nodes).toEqual([{ id: 'method:app/services.py#UserService.get_user', name: 'get_user' }]);
    expect(result.model).toBe('fake-model');
    const user = seen[0].messages[0].content;
    expect(user).toContain('named "is_valid"');
    expect(user).toContain('Demo notes');
    expect(user).toContain('"callers"');
    expect(seen[0].system).toContain('plain, simple language');
    expect(seen[0].maxTokens).toBe(900);
  });

  it('fails with no_api_key when the key is missing', async () => {
    const service = new AiService({
      engine: fakeEngine(),
      settings: settings(),
      secrets: secrets(null),
      providers: [fakeProvider('x', [])],
    });
    await expect(service.explainNode('p1', 'x')).rejects.toMatchObject({ code: 'no_api_key' });
  });

  it('uses direct mode when the chosen backend does not exist', async () => {
    const seen: AiRequest[] = [];
    const service = new AiService({
      engine: fakeEngine(),
      settings: settings({ 'ai.mode': 'cloud' }),
      secrets: secrets('sk-1'),
      providers: [fakeProvider('ok', seen)],
    });
    await expect(service.explainNode('p1', 'x')).resolves.toMatchObject({ markdown: 'ok' });
    expect(seen).toHaveLength(1);
  });
});

describe('AiService.testConnection', () => {
  it('sends a tiny request and reports the model', async () => {
    const seen: AiRequest[] = [];
    const service = new AiService({
      engine: fakeEngine(),
      settings: settings(),
      secrets: secrets('sk-1'),
      providers: [fakeProvider('OK', seen)],
    });
    const result = await service.testConnection();
    expect(result.ok).toBe(true);
    expect(result.model).toBe('fake-model');
    expect(seen[0].maxTokens).toBe(5);
    expect(seen[0].messages[0].content).toBe('Reply with exactly the word OK and nothing else.');
  });
});
