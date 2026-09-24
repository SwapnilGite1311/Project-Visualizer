import { useEffect, useState } from 'react';
import { invoke } from '../../api/bridge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { TextInput } from '../../ui/TextInput';
import { openProjectFlow } from '../import/open-project';
import { useGitStore } from './git-store';

export function GitImportDialog() {
  const { open, cloning, error, setOpen, setCloning, setError } = useGitStore();
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [gitAvailable, setGitAvailable] = useState(true);

  useEffect(() => {
    if (!open) return;
    invoke<boolean>('pv:git.available')
      .then(setGitAvailable)
      .catch(() => setGitAvailable(false));
  }, [open]);

  const submit = async () => {
    setCloning(true);
    setError(null);
    try {
      const { root_path } = await invoke<{ root_path: string }>('pv:git.clone', { url: url.trim(), branch: branch.trim() || undefined });
      setOpen(false);
      await openProjectFlow(root_path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCloning(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Import from Git"
      onClose={() => !cloning && setOpen(false)}
      footer={
        <>
          <Button onClick={() => setOpen(false)} disabled={cloning}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={cloning || !url.trim() || !gitAvailable}>
            {cloning ? 'Cloning…' : 'Clone and open'}
          </Button>
        </>
      }
    >
      {!gitAvailable && <p style={{ color: 'var(--danger)' }}>Git is not installed. Install Git and restart the app.</p>}
      <TextInput label="Repository URL" value={url} placeholder="https://github.com/owner/repo" onChange={setUrl} />
      <TextInput label="Branch (optional)" value={branch} placeholder="default branch" onChange={setBranch} />
      {error && <p style={{ color: 'var(--danger)', wordBreak: 'break-word' }}>{error}</p>}
    </Modal>
  );
}
