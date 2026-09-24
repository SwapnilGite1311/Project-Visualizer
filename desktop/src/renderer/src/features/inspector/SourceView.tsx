import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import 'highlight.js/styles/github-dark.css';
import { useEffect, useMemo, useState } from 'react';
import { getSource } from '../../api/engine';
import { openInEditor } from '../../api/main';
import type { GraphNode, SourceResult } from '../../api/types';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import styles from './SourceView.module.css';

hljs.registerLanguage('python', python);

const WITH_SOURCE = new Set(['module', 'class', 'function', 'method']);
const MAX_LINES = 2000;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Highlight the whole text, then split the HTML into lines (highlight.js escapes the input).
function highlightedLines(text: string, language: string): string[] {
  const html = hljs.getLanguage(language) ? hljs.highlight(text, { language }).value : escapeHtml(text);
  const lines: string[] = [];
  const open: string[] = [];
  for (const raw of html.split('\n')) {
    const line = open.join('') + raw;
    for (const match of raw.matchAll(/<span[^>]*>|<\/span>/g)) {
      if (match[0] === '</span>') open.pop();
      else open.push(match[0]);
    }
    lines.push(line + '</span>'.repeat(open.length));
  }
  return lines;
}

export function SourceView({ node }: { node: GraphNode }) {
  const projectId = useAppStore((s) => s.projectId);
  const projectRoot = useAppStore((s) => s.projectRoot);
  const hasSource = WITH_SOURCE.has(node.kind);
  const [source, setSource] = useState<SourceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSource(null);
    setError(null);
    if (!projectId || !hasSource) return;
    let active = true;
    getSource(projectId, node.id)
      .then((s) => active && setSource(s))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [projectId, node.id, hasSource]);

  const lines = useMemo(() => {
    if (!source) return [];
    const all = source.text.split('\n');
    return highlightedLines(all.slice(0, MAX_LINES).join('\n'), source.language);
  }, [source]);

  if (!hasSource) return <div className={styles.notice}>No source for this element</div>;

  const firstLine = node.kind === 'module' ? 1 : node.span.start_line || 1;
  const totalLines = source ? source.text.split('\n').length : 0;

  const openEditor = () => {
    if (!projectRoot) return;
    openInEditor(`${projectRoot}/${node.file_path}`, node.span.start_line || 1).catch((e: unknown) =>
      notify.error('Could not open the editor', e instanceof Error ? e.message : String(e)),
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <strong>Code</strong>
        <Button size="sm" onClick={openEditor}>
          Open in editor
        </Button>
      </div>
      {error && <div className={styles.notice}>{error}</div>}
      {!source && !error && <Spinner />}
      {source && (
        <pre className={styles.code} data-testid="source-code">
          {lines.map((html, i) => (
            <div key={i} className={styles.line}>
              <span className={styles.number}>{firstLine + i}</span>
              <span className={styles.text} dangerouslySetInnerHTML={{ __html: html || ' ' }} />
            </div>
          ))}
        </pre>
      )}
      {totalLines > MAX_LINES && (
        <div className={styles.notice}>Showing the first {MAX_LINES} of {totalLines} lines. Open the file in an editor to see all.</div>
      )}
    </div>
  );
}
