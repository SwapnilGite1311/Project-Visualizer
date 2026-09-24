import { useState } from 'react';
import { invoke } from '../../api/bridge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { TextInput } from '../../ui/TextInput';
import { openProjectFlow } from '../import/open-project';
import { useInputsStore } from './inputs-store';

export function SnippetDialog() {
  const open = useInputsStore((s) => s.snippetOpen);
  const setOpen = useInputsStore((s) => s.setSnippetOpen);
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('snippet.py');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { root_path } = await invoke<{ root_path: string }>('pv:snippet.create', { code, file_name: fileName });
      setOpen(false);
      await openProjectFlow(root_path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Paste a code snippet"
      onClose={() => !busy && setOpen(false)}
      footer={
        <>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !code.trim()}>
            Visualize
          </Button>
        </>
      }
    >
      <div style={{ fontFamily: 'var(--font-mono, monospace)' }}>
        <TextInput label="Code" value={code} onChange={setCode} multiline />
      </div>
      <TextInput label="File name" value={fileName} onChange={setFileName} />
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
    </Modal>
  );
}
