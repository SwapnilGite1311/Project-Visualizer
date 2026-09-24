import { useAppStore } from '../../core/store';
import { IconButton } from '../../ui/IconButton';
import { goBack, goForward, goHome, goUp, useNavState } from './nav-store';

export function NavButtons() {
  const { canBack, canForward } = useNavState();
  const atTop = useAppStore((s) => s.currentParentId === 'project:');
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <IconButton label="Back" onClick={goBack} disabled={!canBack}>
        ←
      </IconButton>
      <IconButton label="Forward" onClick={goForward} disabled={!canForward}>
        →
      </IconButton>
      <IconButton label="Up one level" onClick={() => void goUp()} disabled={atTop}>
        ↑
      </IconButton>
      <IconButton label="Project overview" onClick={goHome}>
        ⌂
      </IconButton>
    </div>
  );
}
