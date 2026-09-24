// Channels: pv:ai.explainNode {project_id, node_id} → ExplainResult; pv:ai.testConnection → {ok, model, latency_ms};
// pv:ai.providers → [{id, label, needsApiKey, defaultModel, defaultBaseUrl}].
import { AiService } from '../ai/ai-service';
import { listProviders } from '../ai/provider-registry';
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  const service = new AiService({ engine: ctx.engine, settings: ctx.settings, secrets: ctx.secrets });
  ctx.handle('pv:ai.explainNode', (p) => {
    const { project_id, node_id } = (p ?? {}) as { project_id?: unknown; node_id?: unknown };
    if (typeof project_id !== 'string' || typeof node_id !== 'string') throw new Error('project_id and node_id are required');
    return service.explainNode(project_id, node_id);
  });
  ctx.handle('pv:ai.testConnection', () => service.testConnection());
  ctx.handle('pv:ai.providers', () =>
    listProviders().map(({ id, label, needsApiKey, defaultModel, defaultBaseUrl }) => ({
      id,
      label,
      needsApiKey,
      defaultModel,
      defaultBaseUrl,
    })),
  );
}
