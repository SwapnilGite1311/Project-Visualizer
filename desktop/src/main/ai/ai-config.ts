import { AiError, type AiProviderFactory, type ProviderConfig } from './types';

export function readAiConfig(
  settings: { get<T>(k: string, f: T): T },
  secrets: { get(n: string): string | null },
  providers: AiProviderFactory[],
): { factory: AiProviderFactory; config: ProviderConfig } {
  const id = settings.get('ai.provider', 'anthropic');
  const factory = providers.find((p) => p.id === id);
  if (!factory) throw new AiError('provider_error', `Unknown AI provider: ${id}`);
  const model = settings.get('ai.model.' + id, '') || factory.defaultModel;
  const baseUrl = settings.get('ai.baseUrl.' + id, '') || factory.defaultBaseUrl;
  const apiKey = secrets.get('ai.apiKey.' + id) ?? '';
  if (factory.needsApiKey && !apiKey) throw new AiError('no_api_key', 'Add an API key in Settings → AI');
  return { factory, config: { model, baseUrl, apiKey } };
}
