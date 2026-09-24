import explainTemplate from '../../../../contracts/prompts/v1/explain_node.md?raw';
import testTemplate from '../../../../contracts/prompts/v1/test_connection.md?raw';
import { readAiConfig } from './ai-config';
import { cleanCitations } from './citations';
import { parseTemplate, renderTemplate } from './prompt';
import { listProviders } from './provider-registry';
import type { AiProviderFactory } from './types';

export interface ExplainResult { node_id: string; markdown: string; cited_nodes: { id: string; name: string }[]; model: string }

interface NodeRefLite { id: string; name: string }
interface ContextPackLite {
  node: { id: string; kind: string; name: string; file_path: string };
  parent: NodeRefLite | null;
  children: NodeRefLite[];
  callers: NodeRefLite[];
  callees: NodeRefLite[];
  imports: NodeRefLite[];
}

interface ExplainBackend {
  id: string;
  explainNode(input: {
    pack: unknown;
    notes: string;
    valid: Map<string, string>;
  }): Promise<{ markdown: string; cited_nodes: { id: string; name: string }[]; model: string }>;
}

// Backend extension point (used from Phase 4): any ../ai-backends/<id>/index.ts exporting `backend`.
const backends = import.meta.glob<{ backend?: ExplainBackend }>(['../ai-backends/*/index.ts'], { eager: true });

export class AiService {
  private readonly providers: AiProviderFactory[];

  constructor(
    private readonly deps: {
      engine: { request<T>(method: string, params?: unknown): Promise<T> };
      settings: { get<T>(k: string, f: T): T };
      secrets: { get(n: string): string | null };
      providers?: AiProviderFactory[];
      fetchImpl?: typeof fetch;
    },
  ) {
    this.providers = deps.providers ?? listProviders();
  }

  async explainNode(projectId: string, nodeId: string): Promise<ExplainResult> {
    const { engine, settings } = this.deps;
    const pack = await engine.request<ContextPackLite>('context.for_node', {
      project_id: projectId,
      node_id: nodeId,
      max_chars: 12000,
    });
    const status = await engine.request<{ root_path: string }>('project.status', { project_id: projectId });
    const notes = settings.get('project.notes.' + status.root_path, '');

    const valid = new Map<string, string>();
    valid.set(pack.node.id, pack.node.name);
    if (pack.parent) valid.set(pack.parent.id, pack.parent.name);
    for (const list of [pack.children, pack.callers, pack.callees, pack.imports]) {
      for (const ref of list) valid.set(ref.id, ref.name);
    }

    const mode = settings.get('ai.mode', 'direct');
    if (mode !== 'direct') {
      const backend = Object.values(backends)
        .map((m) => m.backend)
        .find((b) => b?.id === mode);
      if (backend) return { node_id: nodeId, ...(await backend.explainNode({ pack, notes, valid })) };
    }

    const vars = {
      kind: pack.node.kind,
      name: pack.node.name,
      file_path: pack.node.file_path || '(no file)',
      project_notes: notes || '(none)',
      context_json: JSON.stringify(pack, null, 1),
    };
    const template = parseTemplate(explainTemplate);
    const { factory, config } = readAiConfig(settings, this.deps.secrets, this.providers);
    const resp = await factory.create(config, this.deps.fetchImpl).complete({
      system: renderTemplate(template.system, vars),
      messages: [{ role: 'user', content: renderTemplate(template.user, vars) }],
      maxTokens: 900,
    });
    const { text, cited } = cleanCitations(resp.text, valid);
    return { node_id: nodeId, markdown: text, cited_nodes: cited, model: resp.model };
  }

  async testConnection(): Promise<{ ok: true; model: string; latency_ms: number }> {
    const template = parseTemplate(testTemplate);
    const { factory, config } = readAiConfig(this.deps.settings, this.deps.secrets, this.providers);
    const started = Date.now();
    const resp = await factory.create(config, this.deps.fetchImpl).complete({
      system: renderTemplate(template.system, {}),
      messages: [{ role: 'user', content: renderTemplate(template.user, {}) }],
      maxTokens: 5,
    });
    return { ok: true, model: resp.model, latency_ms: Date.now() - started };
  }
}
