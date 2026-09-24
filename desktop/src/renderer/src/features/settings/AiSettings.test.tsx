// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { AiSettings } from './AiSettings';

let fake: FakeBridge;
let secrets: Record<string, string>;
let settings: Record<string, unknown>;

beforeEach(() => {
  fake = installFakeBridge();
  secrets = {};
  settings = {};
  fake.invokeHandlers.set('pv:ai.providers', () => [
    { id: 'anthropic', label: 'Anthropic (Claude)', needsApiKey: true, defaultModel: 'claude-haiku-4-5-20251001', defaultBaseUrl: 'https://api.anthropic.com' },
    { id: 'openai', label: 'OpenAI-compatible', needsApiKey: false, defaultModel: '', defaultBaseUrl: 'https://api.openai.com/v1' },
  ]);
  fake.invokeHandlers.set('pv:settings.get', (p) => {
    const { key, fallback } = p as { key: string; fallback: unknown };
    return key in settings ? settings[key] : fallback;
  });
  fake.invokeHandlers.set('pv:settings.set', (p) => {
    const { key, value } = p as { key: string; value: unknown };
    settings[key] = value;
    return true;
  });
  fake.invokeHandlers.set('pv:secrets.set', (p) => {
    const { name, value } = p as { name: string; value: string };
    secrets[name] = value;
    return true;
  });
  fake.invokeHandlers.set('pv:secrets.has', (p) => (p as { name: string }).name in secrets);
  fake.invokeHandlers.set('pv:secrets.delete', (p) => delete secrets[(p as { name: string }).name]);
  fake.invokeHandlers.set('pv:ai.testConnection', () => ({ ok: true, model: 'claude-haiku-4-5-20251001', latency_ms: 420 }));
});

describe('AiSettings', () => {
  it('saves a key without ever showing it again', async () => {
    render(<AiSettings />);
    expect(await screen.findByText('No key')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'sk-secret-123' } });
    fireEvent.click(screen.getByText('Save key'));
    expect(await screen.findByText('Key saved')).toBeInTheDocument();
    expect(secrets['ai.apiKey.anthropic']).toBe('sk-secret-123');
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(document.body.innerHTML).not.toContain('sk-secret-123');
  });

  it('reports a successful connection test', async () => {
    render(<AiSettings />);
    fireEvent.click(await screen.findByText('Test connection'));
    expect(await screen.findByText('Connected to claude-haiku-4-5-20251001 in 420 ms')).toBeInTheDocument();
  });

  it('shows the base URL field for OpenAI-compatible providers', async () => {
    render(<AiSettings />);
    await screen.findByText('No key');
    await waitFor(() => expect(screen.getByLabelText('Provider')).toHaveValue('anthropic'));
    expect(screen.queryByLabelText('Base URL')).toBeNull();
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'openai' } });
    expect(await screen.findByLabelText('Base URL')).toBeInTheDocument();
    expect(settings['ai.provider']).toBe('openai');
  });
});
