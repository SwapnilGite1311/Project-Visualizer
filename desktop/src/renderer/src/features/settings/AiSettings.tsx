import { useCallback, useEffect, useState } from 'react';
import { invoke } from '../../api/bridge';
import { deleteSecret, getSetting, hasSecret, setSecret, setSetting } from '../../api/main';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { TextInput } from '../../ui/TextInput';

interface ProviderInfo { id: string; label: string; needsApiKey: boolean; defaultModel: string; defaultBaseUrl: string }

export function AiSettings() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerId, setProviderId] = useState('anthropic');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async () => {
      setProviders(await invoke<ProviderInfo[]>('pv:ai.providers'));
      setProviderId(await getSetting('ai.provider', 'anthropic'));
    })();
  }, []);

  const loadProviderValues = useCallback(async (id: string) => {
    setModel(await getSetting(`ai.model.${id}`, ''));
    setBaseUrl(await getSetting(`ai.baseUrl.${id}`, ''));
    setKeySaved(await hasSecret(`ai.apiKey.${id}`));
    setTestMessage(null);
  }, []);

  useEffect(() => {
    void loadProviderValues(providerId);
  }, [providerId, loadProviderValues]);

  const provider = providers.find((p) => p.id === providerId);

  const chooseProvider = async (id: string) => {
    setProviderId(id);
    await setSetting('ai.provider', id);
  };
  const saveKey = async () => {
    if (!keyInput) return;
    await setSecret(`ai.apiKey.${providerId}`, keyInput);
    setKeyInput('');
    setKeySaved(true);
  };
  const removeKey = async () => {
    await deleteSecret(`ai.apiKey.${providerId}`);
    setKeySaved(false);
  };
  const testConnection = async () => {
    setTesting(true);
    setTestMessage(null);
    try {
      const r = await invoke<{ ok: true; model: string; latency_ms: number }>('pv:ai.testConnection');
      setTestMessage(`Connected to ${r.model} in ${r.latency_ms} ms`);
    } catch (e) {
      setTestMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <Select
        label="Provider"
        value={providerId}
        options={providers.map((p) => ({ value: p.id, label: p.label }))}
        onChange={(id) => void chooseProvider(id)}
      />
      <TextInput
        label="Model"
        value={model}
        placeholder={provider?.defaultModel || 'Model name'}
        onChange={(v) => {
          setModel(v);
          void setSetting(`ai.model.${providerId}`, v);
        }}
      />
      {provider && provider.id !== 'anthropic' && (
        <>
          <TextInput
            label="Base URL"
            value={baseUrl}
            placeholder={provider.defaultBaseUrl}
            onChange={(v) => {
              setBaseUrl(v);
              void setSetting(`ai.baseUrl.${providerId}`, v);
            }}
          />
          <div style={{ color: 'var(--fg-muted)', fontSize: 12, marginTop: -6, marginBottom: 10 }}>
            For Ollama use http://localhost:11434/v1
          </div>
        </>
      )}
      <TextInput label="API key" type="password" value={keyInput} placeholder="Paste a new key" onChange={setKeyInput} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Button size="sm" variant="primary" disabled={!keyInput} onClick={() => void saveKey()}>
          Save key
        </Button>
        <span style={{ color: 'var(--fg-muted)' }}>{keySaved ? 'Key saved' : 'No key'}</span>
        {keySaved && (
          <Button size="sm" variant="ghost" onClick={() => void removeKey()}>
            Remove key
          </Button>
        )}
      </div>
      <Button onClick={() => void testConnection()} disabled={testing}>
        {testing ? 'Testing…' : 'Test connection'}
      </Button>
      {testMessage && <div style={{ marginTop: 8 }}>{testMessage}</div>}
    </div>
  );
}
