import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { revealNode } from '../../view/reveal';
import { citationsToLinks, parseNodeHref } from './citation-links';
import { useExplainStore } from './explain-store';

const linkButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--accent)',
  cursor: 'pointer',
  textDecoration: 'underline',
  font: 'inherit',
};

export function ExplainPanel() {
  const node = useExplainStore((s) => s.currentNode);
  const result = useExplainStore((s) => (s.currentNode ? s.results[s.currentNode.id] : undefined));
  const loading = useExplainStore((s) => (s.currentNode ? s.loading[s.currentNode.id] : false));
  const error = useExplainStore((s) => (s.currentNode ? s.errors[s.currentNode.id] : undefined));
  const explain = useExplainStore((s) => s.explain);

  if (!node) return <EmptyState title="Choose 'Explain' on any element" />;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
        <Spinner />
        <span>Explaining {node.name}…</span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={`Could not explain ${node.name}`}
        detail={error.message}
        action={
          error.code === 'no_api_key' ? (
            <Button variant="primary" onClick={() => useAppStore.getState().setSettingsOpen(true)}>
              Open settings
            </Button>
          ) : (
            <Button onClick={() => void explain(node, true)}>Try again</Button>
          )
        }
      />
    );
  }

  if (!result) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</strong>
        <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>Model: {result.model}</span>
        <Button size="sm" onClick={() => void explain(node, true)}>
          Regenerate
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px', lineHeight: 1.5 }}>
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const id = href ? parseNodeHref(href) : null;
              if (!id) return <span>{children}</span>;
              return (
                <button style={linkButton} title={id} onClick={() => void revealNode(id)}>
                  {children}
                </button>
              );
            },
          }}
        >
          {citationsToLinks(result.markdown, result.cited_nodes)}
        </ReactMarkdown>
      </div>
      <div style={{ padding: '6px 12px', color: 'var(--fg-muted)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
        AI can make mistakes. Check the code.
      </div>
    </div>
  );
}
