import { useAppStore } from '../../core/store';
import { EmptyState } from '../../ui/EmptyState';
import { Panel } from '../../ui/Panel';
import { Spinner } from '../../ui/Spinner';
import { EdgeList } from './EdgeList';
import { NodeActionsBar } from './NodeActionsBar';
import { NodeDetails } from './NodeDetails';
import { SourceView } from './SourceView';
import { useSelectedNode } from './use-selected-node';

export function InspectorPanel() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const { node, loading, error } = useSelectedNode();
  if (!selectedNodeId) return <EmptyState title="Select an element on the map" />;
  if (error) return <EmptyState title="Could not load this element" detail={error} />;
  if (!node) return loading ? <Spinner /> : null;
  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <NodeDetails node={node} />
        <NodeActionsBar node={node} />
        <SourceView node={node} />
        <EdgeList node={node} />
      </div>
    </Panel>
  );
}
