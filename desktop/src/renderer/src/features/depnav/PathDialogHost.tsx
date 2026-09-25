import { PathDialog } from './PathDialog';
import { usePathDialog } from './path-dialog-store';

export function PathDialogHost() {
  const open = usePathDialog((s) => s.open);
  return open ? <PathDialog onClose={() => usePathDialog.getState().setOpen(false)} /> : null;
}
