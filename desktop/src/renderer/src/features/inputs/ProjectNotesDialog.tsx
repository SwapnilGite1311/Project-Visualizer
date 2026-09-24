import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { TextInput } from '../../ui/TextInput';
import { useInputsStore } from './inputs-store';

export const MAX_NOTES = 2000;

export function ProjectNotesDialog() {
  const open = useInputsStore((s) => s.notesOpen);
  const setOpen = useInputsStore((s) => s.setNotesOpen);
  const root = useAppStore((s) => s.projectRoot);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !root) return;
    let cancelled = false;
    void getSetting<string>('project.notes.' + root, '').then((v) => !cancelled && setNotes(v));
    return () => {
      cancelled = true;
    };
  }, [open, root]);

  const save = async () => {
    if (root) await setSetting('project.notes.' + root, notes.trim());
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      title="Project notes for AI"
      onClose={() => setOpen(false)}
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!root}>
            Save
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-muted)' }}>Example: This is a Flask API. The &apos;jobs&apos; folder runs nightly.</p>
      <TextInput label="Notes" value={notes} onChange={(v) => setNotes(v.slice(0, MAX_NOTES))} multiline />
      <p style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
        {notes.length} / {MAX_NOTES}
      </p>
    </Modal>
  );
}
