import type { AppRegistry } from '../../core/registry';
import { GitImportDialog } from './GitImportDialog';
import { useGitStore } from './git-store';

const openDialog = () => useGitStore.getState().setOpen(true);

export default function register(app: AppRegistry): void {
  app.addWelcomeAction({
    id: 'git-import',
    title: 'Import from Git',
    description: 'Clone a repository and open it',
    order: 10,
    run: openDialog,
  });
  app.addCommand({ id: 'project.importGit', title: 'Import from Git…', run: openDialog });
  app.addGlobal({ id: 'git-import-dialog', component: GitImportDialog });
}
