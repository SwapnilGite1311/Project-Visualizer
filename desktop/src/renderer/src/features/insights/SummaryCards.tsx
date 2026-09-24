import { useState } from 'react';
import type { Summary } from '../../api/types';

const card = (warn = false) => ({
  border: `1px solid ${warn ? 'var(--warning, #f59e0b)' : 'var(--border)'}`,
  borderRadius: 6,
  padding: '6px 8px',
  minWidth: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left' as const,
});
const value = { fontSize: 18, fontWeight: 600 };
const label = { fontSize: 11, color: 'var(--text-muted)' };

export function SummaryCards({ summary }: { summary: Summary }) {
  const [showErrors, setShowErrors] = useState(false);
  const c = summary.counts;
  const errors = summary.syntax_error_files;
  const cards: Array<{ label: string; value: number; title?: string }> = [
    { label: 'Files', value: summary.files },
    { label: 'Lines of code', value: summary.total_loc },
    { label: 'Classes', value: c.class ?? 0 },
    { label: 'Functions + methods', value: (c.function ?? 0) + (c.method ?? 0) },
    { label: 'External libraries', value: summary.externals.length, title: summary.externals.join(', ') },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
        {cards.map((k) => (
          <div key={k.label} style={card()} title={k.title}>
            <div style={value}>{k.value.toLocaleString()}</div>
            <div style={label}>{k.label}</div>
          </div>
        ))}
        <button type="button" style={card(errors.length > 0)} disabled={errors.length === 0} onClick={() => setShowErrors((v) => !v)}>
          <div style={value}>{errors.length}</div>
          <div style={label}>Files with syntax errors</div>
        </button>
      </div>
      {showErrors && errors.length > 0 && (
        <ul aria-label="Files with syntax errors" style={{ margin: '6px 0', paddingLeft: 18, fontSize: 12 }}>
          {errors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
