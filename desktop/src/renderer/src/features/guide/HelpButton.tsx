import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/Icon';
import { useHelpStore } from './tour-store';

// The "?" in the toolbar: opens "How do I…" help.
export function HelpButton() {
  return (
    <span data-tour="help" style={{ display: 'inline-flex' }}>
      <IconButton label="Help (F1)" onClick={() => useHelpStore.getState().show()}>
        <Icon name="help" />
      </IconButton>
    </span>
  );
}
