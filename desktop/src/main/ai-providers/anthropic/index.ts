import { postJson } from '../../ai/http';
import type { AiProviderFactory } from '../../ai/types';

interface AnthropicResponse {
  model?: string;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export const provider: AiProviderFactory = {
  id: 'anthropic',
  label: 'Anthropic (Claude)',
  needsApiKey: true,
  defaultModel: 'claude-haiku-4-5-20251001',
  defaultBaseUrl: 'https://api.anthropic.com',
  create(config, fetchImpl = fetch) {
    return {
      id: 'anthropic',
      async complete(req) {
        const data = (await postJson(
          fetchImpl,
          `${config.baseUrl}/v1/messages`,
          { 'content-type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
          {
            model: config.model,
            max_tokens: req.maxTokens,
            system: req.system,
            messages: req.messages,
            temperature: req.temperature ?? 0.2,
          },
        )) as AnthropicResponse;
        const text = (data.content ?? [])
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('');
        return {
          text,
          model: data.model ?? config.model,
          inputTokens: data.usage?.input_tokens,
          outputTokens: data.usage?.output_tokens,
        };
      },
    };
  },
};
