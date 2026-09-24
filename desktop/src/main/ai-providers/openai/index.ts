import { postJson } from '../../ai/http';
import { AiError, type AiProviderFactory } from '../../ai/types';

interface ChatResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export const provider: AiProviderFactory = {
  id: 'openai',
  label: 'OpenAI-compatible (OpenAI, Ollama, others)',
  needsApiKey: false,
  defaultModel: '',
  defaultBaseUrl: 'https://api.openai.com/v1',
  create(config, fetchImpl = fetch) {
    return {
      id: 'openai',
      async complete(req) {
        if (!config.model) throw new AiError('provider_error', 'Set a model name in Settings → AI');
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
        const data = (await postJson(fetchImpl, `${config.baseUrl}/chat/completions`, headers, {
          model: config.model,
          messages: [{ role: 'system', content: req.system }, ...req.messages],
          max_tokens: req.maxTokens,
          temperature: req.temperature ?? 0.2,
        })) as ChatResponse;
        return {
          text: data.choices?.[0]?.message?.content ?? '',
          model: data.model ?? config.model,
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
        };
      },
    };
  },
};
