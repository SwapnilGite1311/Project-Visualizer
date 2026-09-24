import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { IconButton } from '../../ui/IconButton';
import { ProjectNotesDialog } from './ProjectNotesDialog';
import { SnippetDialog } from './SnippetDialog';
import { useInputsStore } from './inputs-store';

const openSnippet = () => useInputsStore.getState().setSnippetOpen(true);
const openNotes = () => useInputsStore.getState().setNotesOpen(true);

export function NotesButton() {
  const projectId = useAppStore((s) => s.projectId);
  if (!projectId) return null;
  return (
    <IconButton label="Project notes" onClick={openNotes}>
      ✎
    </IconButton>
  );
}

export default function register(app: AppRegistry): void {
  app.addWelcomeAction({
    id: 'snippet',
    title: 'Paste a code snippet',
    description: 'Visualize a few files of code quickly',
    order: 20,
    run: openSnippet,
  });
  app.addToolbarItem({ id: 'project-notes', order: 60, side: 'right', component: NotesButton });
  app.addCommand({ id: 'project.pasteSnippet', title: 'Paste a code snippet…', run: openSnippet });
  app.addCommand({ id: 'project.notes', title: 'Project notes for AI…', run: openNotes });
  app.addGlobal({ id: 'snippet-dialog', component: SnippetDialog });
  app.addGlobal({ id: 'project-notes-dialog', component: ProjectNotesDialog });
}
