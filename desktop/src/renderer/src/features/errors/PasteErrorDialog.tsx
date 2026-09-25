import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { hasProjectFrame, useErrorsStore } from './errors-store';

export function PasteErrorDialog({ onClose }: { onClose(): void }) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const entry = await useErrorsStore.getState().paste(text);
      if (entry && hasProjectFrame(entry)) onClose();
      else setMessage('None of these lines are in the open project.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Find an error on the map"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!text.trim() || busy} onClick={() => void find()}>
            Find on map
          </Button>
        </>
      }
    >
      <textarea
        aria-label="Stack trace"
        placeholder="Paste a stack trace or error output"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        spellCheck={false}
        autoFocus
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-mono, ui-monospace, Consolas, monospace)',
          fontSize: 12,
        }}
      />
      {message && (
        <p role="alert" style={{ color: 'var(--danger)', margin: '6px 0 0' }}>
          {message}
        </p>
      )}
    </Modal>
  );
}

export function PasteErrorDialogHost() {
  const open = useErrorsStore((s) => s.dialogOpen);
  return open ? (
    <PasteErrorDialog onClose={() => useErrorsStore.getState().setDialogOpen(false)} />
  ) : null;
}
