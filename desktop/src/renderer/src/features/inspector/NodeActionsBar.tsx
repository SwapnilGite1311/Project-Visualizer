import { appRegistry, type NodeRef, type RegistryReader } from '../../core/registry';
import { Button } from '../../ui/Button';

export function NodeActionsBar({ node, registry = appRegistry }: { node: NodeRef; registry?: RegistryReader }) {
  const actions = registry.nodeActions(node);
  if (actions.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {actions.map((a) => (
        <Button key={a.id} variant="secondary" size="sm" onClick={() => void a.run(node)}>
          {a.title}
        </Button>
      ))}
    </div>
  );
}
