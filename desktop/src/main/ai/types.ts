export interface AiMessage { role: 'user' | 'assistant'; content: string }
export interface AiRequest { system: string; messages: AiMessage[]; maxTokens: number; temperature?: number }
export interface AiResponse { text: string; model: string; inputTokens?: number; outputTokens?: number }
export interface AiProvider { id: string; complete(req: AiRequest): Promise<AiResponse> }
export interface ProviderConfig { model: string; baseUrl: string; apiKey: string }
export interface AiProviderFactory {
  id: string; label: string; needsApiKey: boolean; defaultModel: string; defaultBaseUrl: string;
  create(config: ProviderConfig, fetchImpl?: typeof fetch): AiProvider;
}
export class AiError extends Error {
  constructor(public code: 'no_api_key' | 'auth' | 'rate_limit' | 'network' | 'provider_error' | 'bad_template', message: string) {
    super(message); this.name = 'AiError';
  }
}
